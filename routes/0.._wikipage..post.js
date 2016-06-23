var fs = require("fs");
var _ = require("underscore");
var async = require("async");
var uuid = require('node-uuid');
var Auth = require("../libs/Authentication.js");
var AccessManagement = require("../libs/AccessManagement.js");
var WikiHandler = require("../libs/WikiHandler.js");
var Audit = require("../libs/Audit.js");
var GetHTML = require("../libs/GetHTML.js");
var FileHandler = require("../libs/FileHandler.js");
var CodeRunner = require("../libs/CodeRunner.js");
var ChildProcesses = require("../libs/ChildProcesses.js");
var config = require("../libs/config.js");
var log = require("bunyan").createLogger(config.logger.options());

module.exports = function(req,res) {
  var info = req.body;

  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db:config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});

  if (info.file) {
    var fileInfo = info.file;
    var fileName = fileInfo.name;
    var filePath = fileInfo.path;
    var fileType = fileInfo.type;
  }

  var username = A.username;
  var wiki = new WikiHandler({path:decodeURI(info.page)});
  var fh = new FileHandler({db:config.mongodb.filedb});

  switch(info.type) {
    case "init":
      async.parallel([
        function(callback) {
          wiki.getPage(function(e,pageInfo) {
            callback(e,pageInfo);
          });
        },
        function(callback) {
          async.waterfall([
            function(_callback) {
              wiki.getPageContent(function(e,html,oTemplateConfig,templateId) {
                return _callback(e,{html:html, config:oTemplateConfig, templateId:templateId});
              });
            },
            function(oInfo,_callback) {
              if (oInfo.config && oInfo.config.length) {
                var queryResults = {};

                wiki.getTemplateInfo(oInfo.templateId,function(e,template) {
                  return _callback(e,{
                    html: oInfo.html,
                    config: template.config,
                    templateId: oInfo.templateId
                  });
                });

              } else {
                return _callback(null,oInfo);
              }
            }
          ],
            function(err,oInfo) {
              callback(err,oInfo);
            }
          );
        },
        function(callback) {
          wiki.validatePassword({session:req.session},function(e,validated) {
            callback(e,validated);
          })
        },
        function(callback) {
          wiki.getTemplates(function(e,templates) {
            callback(e,templates);
          });
        },
        function(callback) {
          Access.isAdmin({username:username, path:wiki.path, editOnly:true},function(e,isAdmin) {
            callback(e,isAdmin);
          });
        },
        function(callback) {
          Access.canViewPage({session:req.session, username:username, path:wiki.path},function(e,canView) {
            callback(e,canView);
          });
        },
        function(callback) {
          async.waterfall([
            function(_callback) {
              wiki.getSubPages(function(e,aPages) {
                _callback(e,aPages);
              }, true);
            },
            function(aPages,_callback) {
              Access.onlyViewablePaths({username:username, paths:aPages, session:req.session},function(_err,filteredPages) {
                filteredPagesOnlyPaths = filteredPages.map(function(p) {return p.path});
                _callback(_err,filteredPagesOnlyPaths);
              });
            },
            function(filteredPages,_callback) {
              try {
                var oPages = {};
                var pagesSplit = [];
                for (var _i=0; _i<filteredPages.length; _i++) {
                  pagesSplit = filteredPages[_i].split("/").slice(1);
                  oPages = Object.merge(oPages,wiki.aryToNestedObj(pagesSplit));
                }

                return _callback(null,oPages);
              } catch(_e) {
                return _callback(_e);
              }
            }
          ],
            function(err,oFilteredPages) {
              return callback(err,oFilteredPages);
            }
          );
        }
      ],
        function(err,results) {
          if (err) return res.json({success:false, error:err});

          var pageInfo = results[0];
          var oPageContent = results[1];
          var validated = results[2];
          var templates = results[3];
          var canUpdate = results[4];
          var canViewPage = results[4] || results[5];   //if wiki admin then true, otherwise check view access scope
          var oSubPages = results[6];

          if (!validated) return res.json({success:false, protected:true});
          else if (!canViewPage) return res.json({success:false, outofscope:true});

          var oTemplate = {};
          if (pageInfo instanceof Array && pageInfo.length && typeof pageInfo[0].template === "object") {
            oTemplate = {
              isEasyConfig: (pageInfo[0].template.templateId) ? "Yes" : "No",
              templateId: pageInfo[0].template.templateId,
              config: pageInfo[0].template.config
            };
          }


          var oRet;
          if (!pageInfo.length) {
            oRet = {success:true, exists:false, updateable:canUpdate, html:"", markdown:""};
          } else {
            oRet = {
              success: true,
              exists: true,
              updateable: canUpdate,
              template: oTemplate,
              masterTemplateConfig: oPageContent.config,
              html: oPageContent.html,
              markdown: pageInfo[0].content_markdown,
              description: pageInfo[0].description,
              widgets: pageInfo[0].widgets,
              lastUpdate: pageInfo[0].updated,
              person: pageInfo[0].updatedBy,
              tags: pageInfo[0].tags,
              pageFiles: pageInfo[0].files,
              password: pageInfo[0].password,
              pageadmins: (typeof pageInfo[0].settings==="object") ? pageInfo[0].settings.admins : [],
              viewscopes: (typeof pageInfo[0].settings==="object") ? pageInfo[0].settings.viewscope : [],
              pageEvents: pageInfo[0].events,
              subpages: (Object.size(oSubPages)) ? oSubPages : [],
              hideAllOfHeader: pageInfo[0].hideAllOfHeader
            };
          }

          //get like information and determine if the current logged in user
          //is allowed to like (i.e. whether they've already liked the page)
          if (pageInfo.length && typeof pageInfo[0].likes==="object") {
            oRet.pageLikes = pageInfo[0].likes.number;

            if (username) {
              var canLike = true;
              _.each(pageInfo[0].likes.info,function(like) {
                if (like.username == username) {
                  canLike = false;
                  return;
                }
              });

              oRet.canLike = canLike;
            }
          }

          //add templates to what is returned and save subpages
          oRet.pageTemplates = templates || [];

          if (A.isLoggedIn()) {
            config.mongodb.db.collection("accounts").find({username:username},{files:{$slice:100}, drafts:{$elemMatch:{path:wiki.path}}}).toArray(function(_e,userInfo) {
              if (_e) log.error(_e);
              else if (!userInfo.length) log.trace("Tried getting files for user " + username + " but this user does not have an account record yet.");
              else oRet = Object.merge(oRet,{userFiles:userInfo[0].files, draft:(userInfo[0].drafts instanceof Array)?userInfo[0].drafts[0]:false});

              res.json(oRet);
            });
          } else {
            res.json(oRet);
          }

          wiki.event("visitpage",function(e,result) {if (e) log.error(e);});
        }
      );

      break;

    case "postinit":
      async.parallel([
        function(callback) {
          wiki.getPage({fields:{_id:0, path:1, comments:1}},function(e,pageInfo) {
            callback(e,pageInfo);
          });
        },
        function(callback) {
          wiki.getPage({archive:true, filters:{path:wiki.path}},function(e,pageInfo) {
            callback(e,pageInfo);
          });
        },
        function(callback) {
          wiki.getModules({fields:{_id:0, key:1, name:1, description:1, config:1}},function(e,modules) {
            callback(e,modules);
          });
        },
        function(callback) {
          wiki.getModuleInstances(null,function(e,instances) {
            callback(e,instances);
          });
        },
        function(callback) {
          try {
            var scopetypes = _.mapObject(Access.memberScopeTypeFunctionMap(),function(val,t) {
              return {
                type: t,
                name: val.name
              };
            });
            scopetypes = _.values(scopetypes).sort(function(a,b) {
              return (a.name > b.name) ? 1 : -1;
            });

            return callback(null,scopetypes);

          } catch(e) {
            return callback(e);
          }
        },
        function(callback) {
          config.mongodb.db.collection("adminsettings").find({domid:"event_types"}).toArray(function(e,types) {
            if (e) return callback(e);
            if (!types || !types.length || !(typeof types[0] === "object") || !(types[0].value instanceof Array)) return callback(null,[]);

            return callback(null,types[0].value.filter(function(t) {return t.scope == "page"}).sort(function(a,b) {return (a.type > b.type) ? 1 : -1}));
          });

          // $FILTER IS ONLY SUPPORTED BY MONGODB 3.2+
          /*config.mongodb.db.collection("adminsettings").aggregate([
            {
              $match: {domid:"event_types"}
            },
            {
              $project: {
                _id: 0,
                value: {
                  $filter: {
                    input: "$value",
                    as: "v",
                    cond: {
                      $eq: ["$$v.scope","page"]
                    }
                  }
                }
              }
            }
          ],
            function(e,types) {
              if (e) return callback(e);
              if (!types || !types.length || !(typeof types[0] === "object") || !(types[0].value instanceof Array)) return callback(null,[]);

              return callback(null,types[0].value.sort(function(a,b) {return (a.type > b.type) ? 1 : -1}));
            }
          );*/
        },
        function(callback) {
          wiki.getPage({filters:{aliasfor:wiki.path},fields:{path:1,_id:0}},function(e,aliases) {
            callback(e,aliases);
          });
        },
        function(callback) {
          wiki.getExternalDatasources(function(e,datasources) {
            callback(e,datasources);
          });
        }
      ],
        function(err,results) {
          if (err) {
            res.json({success:false, error:err});
            return log.error(err);
          }

          var pageDetails = results[0];
          var pageArchive = results[1];
          var modules = results[2];
          var moduleInstances = results[3];
          var viewScopeTypes = results[4];
          var eventTypes = results[5];
          var aliases = results[6];
          var externalDatasources = results[7];

          if (!pageDetails.length) return res.json({success:true});

          return res.json({
            success:true,
            versions: pageArchive,
            modules: modules,
            pageModules: moduleInstances,
            scopeTypes: viewScopeTypes,
            eventTypes: eventTypes.map(function(t) {return t.type}),
            pageAliases: aliases.map(function(t) {return t.path}),
            datasources: externalDatasources,
            comments: pageDetails[0].comments
          });
        }
      );

      break;

    case "update":
      if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to update wiki pages."});

      async.parallel([
        function(callback) {
          wiki.getPage(function(_e,current) {
            callback(_e,current);
          });
        },
        function(callback) {
          wiki.validatePassword({session:req.session},function(e,validated) {
            callback(e,validated);
          });
        },
        function(callback) {
          Access.isAdmin({username:username, path:wiki.path},function(e,isAdmin) {
            callback(e,isAdmin);
          });
        },
        function(callback) {
          //find and upload template files, only if applicable this
          //is an easy configuration template and there are files that
          //need to be uploaded
          var regexTemplateConfigTest = /(templateFiles\[)(.{1,30})(\]\[\d+\])/;
          var infoTemplateFiles = Object.keys(info).filter(function(_k) {
            return regexTemplateConfigTest.test(_k);
          }).map(function(__k) {
            return {
              configKey: __k.replace(regexTemplateConfigTest,"$2"),
              fileName: info[__k].name,
              filePath: info[__k].path,
              fileType: info[__k].type
            }
          });

          if (infoTemplateFiles.length) {
            async.parallel(infoTemplateFiles.map(function(oConf) {
              return function(_callback) {
                fh.uploadFile({filename:oConf.fileName, path:oConf.filePath},function(err,newFileName) {
                  if (err) return _callback(err);

                  oConf.newFileName = newFileName;
                  _callback(err,oConf);

                  return fs.unlink(oConf.filePath,function(e) {if (e) log.info(e)});
                });
              }
            }),
              function(err,oTemplates) {
                return callback(err,oTemplates);
              }
            );
          } else return callback();
        }
      ],
        function(err,results) {
          if (err) return res.json({success:false, error:err});

          var current = results[0];
          var validated = results[1];
          var canUpdate = results[2];
          var aTemplateFiles = results[3] || [];

          if (!validated) return res.json({success:false, error:"You cannot edit a password-protected page until you have authenticated with it."});
          if (!canUpdate) return res.json({success:false, error:"You cannot update this page as you do not have appropriate rights to update it. Please contact the page administrators to get access."});

          var saveData = {
            "$set": {
              path: wiki.path,
              content_html: info.html,
              content_markdown: info.markdown,
              updated: new Date(),
              updatedBy: {username:username, firstname:A.getFirstname(), lastname:A.getLastname()}
            }
          };

          //populate template info based on info provided
          var oTemplate = JSON.parse(info.template || "");
          saveData["$set"].template = (oTemplate && oTemplate.isEasyConfig == "Yes") ? {
            templateId: oTemplate.templateId,
            config: oTemplate.config || {}
          } : {};

          aTemplateFiles.forEach(function(oTemp) {
            if (typeof saveData["$set"].template.config === "object") {
              saveData["$set"].template.config[oTemp.configKey] = saveData["$set"].template.config[oTemp.configKey] || [];
              saveData["$set"].template.config[oTemp.configKey] = saveData["$set"].template.config[oTemp.configKey].concat(oTemp.newFileName);
            }
          });

          //save the data, pull any drafts the user may
          //have had for this page, archive the former page, write
          //an entry in the audit log,
          //and call the event handler for updating a page.
          async.parallel([
            function(callback) {
              config.mongodb.db.collection("wikicontent").update({ path:wiki.path },saveData,{ upsert:true },
                function(err,doc) {
                  callback(err,doc);
                }
              );
            },
            function(callback) {
              config.mongodb.db.collection("accounts").update({username:username},{$pull:{drafts: {path:wiki.path}}},
                function(e,result) {
                  callback(e,result);
                }
              );
            },
            function(callback) {
              if (current.length) {
                var oArchive = current[0];
                delete(oArchive["_id"]);

                config.mongodb.db.collection("wikicontent_archive").insert(oArchive,function(err,result) {
                  callback(err,result);
                });
              } else {
                wiki.event({type:"createpage", params:{username:username}},function(e,result) {if (e) log.error(e);});
                callback(err,true);
              }
            },
            function(callback) {
              try {
                audit.log({type:"Update Page", additional:{path:wiki.path}});
                callback(null,true);
              } catch(err) {
                callback(err,null);
              }
            },
            function(callback) {
              try {
                wiki.event({type:"updatepage", params:{username:username}},function(e,result) {if (e) log.error(e);});
                callback(null,true);
              } catch(err) {
                callback(err);
              }
            }
          ],
            function(err,results) {
              if (err) {
                res.json({success:false, error:"There was an error saving your information. Please try again."});
                return log.error(err);
              }

              var mailInfo = results[4];
              if (!mailInfo) log.debug("The page update subscriber e-mail did not send either because there are no subscribers or the template is corrupted.");

              return res.json({success:true});
            }
          );
        }
      );

      break;

    case "delete":
      if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to delete a wiki page."});

      async.parallel([
        function(callback) {
          Access.isAdmin({username:username, path:wiki.path},function(e,isAdmin) {
            callback(e,isAdmin);
          });
        }
      ],
        function(err,results) {
          if (err) {
            res.json({success:false, error:err});
            return log.error(err);
          }

          var isAdmin = results[0];

          if (!isAdmin) return res.json({success:false, error:"You must be a page admin to delete a wiki page."});

          wiki.deletePage(function(e) {
            if (e) {
              res.json({success:false, error:e});
              return log.error(err);
            }

            return res.json({success:true});
          });
        }
      );

      break;

    case "aliases":
      if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to delete a wiki page."});

      var aliases = info.aliases || [];

      wiki.updateAliases({aliases:aliases, Access:Access, username:username},function(err) {
        if (err) {
          res.json({success:false, error:(typeof err==="string") ? err : "There was an issue trying to update your page aliases. Please try again."});
          return log.error(err);
        }

        return res.json({success:true});
      });

      break;

    case "updatePageEvents":
      var events = info.events || [];
      events = events.map(function(e) {
        return Object.removeDollarKeys(e);
      });

      async.parallel([
        function(callback) {
          Access.isAdmin({username:username, path:wiki.path},function(e,isAdmin) {
            callback(e,isAdmin);
          });
        }
      ],
        function(err,results) {
          if (err) {
            res.json({success:false, error:err});
            return log.error(err);
          }

          var isAdmin = results[0];

          if (!isAdmin) return res.json({success:false, error:"You need to be a page admin to perform this function."});

          config.mongodb.db.collection("wikicontent").update({ path:wiki.path },{ $unset:{events:1} },function(_e) {
            config.mongodb.db.collection("wikicontent").update({ path:wiki.path },{ $set:{events:events} },function(__e) {
              var error = _e || __e || null;
              if (error) return res.json({success:false, error:error});

              return res.json({success:true});
            });
          });
        }
      );

      break;

    case "updatePageModules":
      var modules = info.modules || [];
      modules = modules.map(function(m) {
        m.path = wiki.path;
        if (!m.uid) m.uid = uuid.v1();

        return Object.removeDollarKeys(m);
      }).filter(function(_m) {
        return !!_m.modulekey;
      });

      async.parallel([
        function(callback) {
          Access.isAdmin({username:username, path:wiki.path},function(e,isAdmin) {
            callback(e,isAdmin);
          });
        }
      ],
        function(err,results) {
          if (err) {
            res.json({success:false, error:err});
            return log.error(err);
          }

          var isAdmin = results[0];
          if (!isAdmin) return res.json({success:false, error:"You need to be a page admin to perform this function."});

          async.series([
            function(callback) {
              config.mongodb.db.collection("wiki_modules_instances").remove({ path:wiki.path },function(_e) {
                callback(_e);
              });
            },
            function(callback) {
              if (!modules.length) return callback();

              config.mongodb.db.collection("wiki_modules_instances").insert(modules,function(_e) {
                callback(_e);
              });
            }
          ],
            function(_err,_results) {
              if (_err) {
                res.json({success:false, error:_err});
                return log.error(_err);
              }

              res.json({success:true});
            }
          );
        }
      );

      break;

    case "prettify":
      var h = info.html || "";
      h = h.replace(/^[\s\t]*(\r\n|\n)/g,"");

      var newHtml = new GetHTML().prettify(h);
      if (typeof newHtml==="string") res.json({success:true, html:newHtml});
      else res.json({success:false, error:"There was an issue prettifying your HTML."});

      break;

    case "password":
      var password = info.password;
      wiki.validatePassword({session:req.session, password:password},function(e,validated) {
        if (validated) {
          res.json({success:true});
        } else {
          res.json({success:false, error:"Password is incorrect, please try again."});
        }
      });

      break;

    case "updatePassword":
      var password = info.password;

      var data = (info.clear) ? {$unset:{password:""}} : {$set:{password:password}};

      config.mongodb.db.collection("wikicontent").update({ path:wiki.path },data,{ upsert:true },
        function(e,doc) {
          if (err) res.json({success:false, error:err});
          else res.json({success:true});

          audit.log({type:"Update Page Password", additional:{path:wiki.path}});
        }
      );

      break;

    case "subscribe":
      var unsubscribe = info.unsubscribe || false;
      var useaccount = info.useaccount || 'no';
      var email = info.email || "";

      var updateData = {};

      if (unsubscribe) {
        if (useaccount=="yes") {
          updateData["$pull"] = {"subscribers.username":username};
        } else {
          updateData["$pull"] = {"subscribers.email":email};
        }
      } else {
        if (useaccount=="yes") {
          if (!A.isLoggedIn()) {
            res.json({success:false, error:"You must be logged in to subscribe using your account information."});
            return;
          } else {
            email = A.getEmail();
            updateData["$push"] = {subscribers: {username:username, email:email}};
          }
        } else {
          if (email) {
            updateData["$push"] = {subscribers: {email:email}};
          } else {
            res.json({success:false, error:"Please enter a valid e-mail address to continue."});
            return;
          }
        }
      }

      config.mongodb.db.collection("wikicontent").update({ path:wiki.path },updateData,{upsert:true},function(e,doc) {
        if (e) {
          log.error(e);
          res.json({success:false, error:e});
        } else {
          res.json({success:true});

          audit.log({type:"New Subscriber", additional:{path:wiki.path, email:email}});
          wiki.event({type:"newpagesubscriber", params:{email:email}},function(e,result) {if (e) log.error(e);});
        }
      });

      break;

    case "like":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to like a wiki page."});
      else {
        if (info.unlike) {
          config.mongodb.db.collection("wikicontent").update({ path:wiki.path },{$inc:{"likes.number":-1},$pull:{"likes.info":{username:username}}},{ upsert:true },
            function(err,doc) {
              if (err) res.json({success:false, error:err});
              else res.json({success:true});

              audit.log({type:"Unlike", additional:{path:wiki.path}});
              wiki.event({type:"pageunliked", params:{username:username}},function(e,result) {if (e) log.error(e);});
            }
          );
        } else {
          config.mongodb.db.collection("wikicontent").update({ path:wiki.path },{$inc:{"likes.number":1},$push:{"likes.info":{
            username: username,
            date: new Date()
          }}},{ upsert:true },
            function(err,doc) {
              if (err) res.json({success:false, error:err});
              else res.json({success:true});

              audit.log({type:"Like", additional:{path:wiki.path}});
              wiki.event({type:"pageliked", params:{username:username}},function(e,result) {if (e) log.error(e);});
            }
          );
        }
      }

      break;

    case "updateDraft":
      var onlyDelete = (info.delete==="false") ? false : (info.delete || false);

      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to update wiki pages."});
      else {
        var saveData = {
          "$push": {
            drafts: {
              path: wiki.path,
              html: info.html,
              date: new Date()
            }
          }
        };

        //populate template info based on info provided
        var oTemplate = JSON.parse(info.template || "");
        saveData["$push"].drafts.template = (oTemplate && oTemplate.isEasyConfig == "Yes") ? {
          isEasyConfig: "Yes",
          templateId: oTemplate.templateId,
          masterConfig: oTemplate.masterConfig,
          config: oTemplate.config || {}
        } : {};

        async.series([
          function(callback) {
            config.mongodb.db.collection("accounts").update({username:username},{$pull:{drafts: {path:wiki.path}}},
              function(e,result) {
                callback(e,result);
              }
            );
          },
          function(callback) {
            if (onlyDelete) return callback();

            config.mongodb.db.collection("accounts").update({username:username},saveData,{upsert:true},
              function(er,result) {
                callback(er,result);
              }
            );
          }
        ],
          function(err,results) {
            if (err) {
              res.json({success:false, error:"There was an error saving your draft. Please try again."});
              return log.error(er);
            }

            res.json({success:true});
            audit.log({type:"Update Draft", additional:{path:wiki.path}});
          }
        );
      }

      break;

    case "getTemplate":
      var templateName = info.template;
      var gH = new GetHTML();

      async.waterfall([
        function(callback) {
          config.mongodb.db.collection("wikitemplates").find({file:templateName},{_id:1}).toArray(function(e,result) {
            if (e) return callback(e);
            if (!result || !result.length) return callback(null,null);

            return callback(null,result[0]._id);
          });
        },
        function(templateId,callback) {
          if (!templateId) return callback();

          wiki.getTemplateInfo(templateId,function(e,template) {
            return callback(e,template);
          });
        },
        function(template,callback) {
          if (typeof template !== "object" || !template.file) return callback(null,template,"");

          fh.getFile({filename:template.file, encoding:"utf8"},function(e,result) {
            return callback(e,template,result);
          });
        },
        function(template,fileContents,callback) {
          if (fileContents) {
            try {
              var method = gH.extension(template.file).substring(1);
              gH[method](fileContents,function(e,html) {
                return callback(e,template,html);
              });

            } catch (e) {
              return callback(e,template,null);
            }

          } else return callback(null,template,null);
        }
      ],
        function(err,oTemplate,templateHtml) {
          if (err) {
            res.json({success:false, error:(typeof err === "string") ? err : "There was a problem getting your template."});
            return log.error(err);
          }

          res.json({success:true, html:templateHtml, templateInfo:oTemplate});
        }
      );

      break;

    case "wordToHtml":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        if (/.+openxmlformats\-officedocument.+/.test(fileType)) {
          new ChildProcesses({command:"bin/wordtohtml", args:filePath, timeout:30}).run(function(err,result) {
            if (err) {
              log.error(err);
              res.json({wordsuccess:false, error:"Uh oh, there was an issue trying to convert your document. Please make sure it's a valid Microsoft Word document and try again. If this is a large Word file (>=1mb), it might not be a good idea to try to convert it through this tool as there is a 30 second timeout to convert the document."});
            } else {
              res.json({wordsuccess:true, html:result});
              audit.log({type:"Word To HTML Conversion", additional:{filePath:filePath}});
            }
          });
        } else {
          res.json({wordsuccess:false, error:"Uh oh, this doesn't appear to be a valid Microsoft Word document that we can parse and convert. Please try again."});
        }
      }

      break;

    case "uploadFile":
      if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});

      fh.uploadFile({filename:fileName, path:filePath},function(err,newFileName) {
        if (err) {
          log.error(err);
          res.json({filesuccess:false, error:err});
        } else {
          log.debug("File created and piped to GridFS. Filename: "+newFileName);

          var newFileInfo = {
            uploadedTime: new Date(),
            origFilename: fileName,
            filename: newFileName
          };

          res.json({filesuccess:true, fileInfo:newFileInfo});

          var fileScope = info.scope;
          var coll = (fileScope=="page") ? "wikicontent" : "accounts";
          var filter = (fileScope=="page") ? {path:wiki.path} : {username:username};
          config.mongodb.db.collection(coll).update(filter,{
            "$push": {
              files: newFileInfo
            }
          },{upsert:true},function(err) {
            if (err) log.error(err);

            audit.log({type:"Upload File to GridFS", additional:{fileInfo:newFileInfo}});
          });
        }
      });

      break;

    case "deleteFile":
      if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});

      var fileName = info.filename;
      fh.deleteFile({filename:fileName},function(e) {
        if (e) log.error(e);

        var fileScope = info.scope;
        var coll = (fileScope=="page") ? "wikicontent" : "accounts";
        var filter = (fileScope=="page") ? {path:wiki.path} : {username:username};
        config.mongodb.db.collection(coll).update(filter,{ "$pull": { files:{ filename:fileName } }},{upsert:true},function(err) {
          if (err) {
            res.json({success:false, error:err});
            return log.error(err);
          }

          res.json({success:true});
          audit.log({type:"Delete File From GridFS", additional:{fileName:fileName}});
        });
      });

      break;

    case "deleteTemplateConfigFile":
      if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});

      var confKey = info.configKey;
      var file = info.filename;

      //{"template.config." + confKey: {$eq:file} }
      var cond = "template.config." + confKey;
      var pullCond = {};
      pullCond[cond] = file;

      async.parallel([
        function(callback) {
          config.mongodb.db.collection("wikicontent").update({path:wiki.path},{$pull:pullCond},
            function(e,result) {
              callback(e,result);
            }
          );
        },
        function(callback) {
          fh.deleteFile({filename:file},function(e) {
            callback(e);
          });
        }
      ],
        function(err,results) {
          if (err) {
            res.json({success:false, error:"Something went wrong when deleting your file. Please try again or contact your administrator if the problem persists."});
            return log.error(err);
          }

          return res.json({success:true});
        }
      );

      break;

    case "updatePath":
      if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});

      var newPath = info.newPath;
      newPath = (newPath.indexOf("/") == 0) ? newPath : "/"+newPath;

      async.parallel([
        function(callback) {
          wiki.allowedPath(newPath,function(e,isAllowed) {
            callback(e,isAllowed);
          });
        },
        function(callback) {
          wiki.getPage({filters:{path:newPath},fields:{path:1}},function(e,page) {
            callback(e,page);
          });
        },
        function(callback) {
          Access.isAdmin({username:username, path:wiki.path},function(e,isAdmin) {
            callback(e,isAdmin);
          });
        }
      ],
        function(err,results) {
          if (err) {
            res.json({success:false, error:"There was an issue trying to update your path. Please try again."});
            return log.error(err);
          }

          var allowed = results[0];
          var page = results[1];
          var canUpdate = results[2];

          if (!canUpdate) return res.json({success:false, error:"You cannot update the path as you do not have appropriate rights. Contact the page administrator to get access."});
          else if (!allowed) return res.json({success:false, error:"Path " + newPath + " is not a valid path to change to. Please try another path."});
          else if (page.length) return res.json({success:false, error:"The path, " + newPath + ", already exists and can't be overwritten. Please try another path or delete/move the page at " + newPath + " and try again."});

          async.parallel([
            function(callback) {
              config.mongodb.db.collection("wikicontent").update({path:wiki.path},{$set:{path:newPath, updated:new Date()}},function(err) {
                callback(err);
              });
            },
            function(callback) {
              config.mongodb.db.collection("wiki_modules_instances").update({path:wiki.path},{$set:{path:newPath}},function(err) {
                callback(err);
              });
            }
          ],
            function(err,results) {
              if (err) return res.json({success:false, error:err});

              res.json({success:true});

              audit.log({type:"Update Page Path", additional:{formerPath:wiki.path, newPath:newPath}});
              wiki.event({type:"updatepagepath", params:{username:username, formerPath:wiki.path, newPath:newPath}},function(e,result) {if (e) log.error(e);});
            }
          );
        }
      );

      break;

    case "updatePageSetting":
      async.parallel([
        function(callback) {
          try {
            var loggedIn = A.isLoggedIn();
            callback(null,loggedIn);
          } catch(e) {
            callback(e);
          }
        },
        function(callback) {
          Access.isAdmin({username:username, path:wiki.path},function(e,isAdmin) {
            callback(e,isAdmin);
          });
        }
      ],
        function(err,results) {
          if (err) return res.json({success:false, error:err});

          var isLoggedIn = results[0];
          var canEdit = results[1];

          if (!isLoggedIn) return res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
          if (!canEdit) return res.json({success:false, error:"You must be a page administrator to make edits to page settings."});

          var key = info.key;
          var val = info.value;

          if (key=="widgets") for (var _k in val) val[_k].enabled = (val[_k].enabled=="false" || val[_k].enabled=="0") ? false : (!!val[_k].enabled);
          if (key=="settings.viewscope") for (var _k in val) val[_k] = Object.removeDollarKeys(val[_k]);
          if (val === "false") val = false;

          var o = {};
          o[key] = val;
          var saveData = {}
          saveData[(val)?"$set":"$unset"] = o;

          config.mongodb.db.collection("wikicontent").update({path:wiki.path},saveData,{ upsert:true },function(err) {
            if (err) res.json({success:false, error:err});
            else res.json({success:true});

            audit.log({type:"Update Page Setting", additional:{path:wiki.path,settingInfo:o}});
          });
        }
      );

      break;

    case "adfind":
      if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});

      var objType = info.objType || "user";
      var queryText = info.search;

      if (queryText.length) {
        A.find({query:"(|(sAMAccountName=*" + queryText + "*)(cn=*" + queryText + "*)(givenName=*" + queryText + "*)(surName=*" + queryText + "*)(email=*" + queryText + "*))"},function(err,results) {
        if (err) {
          res.json({success:false});
          return log.error(err);
        }

        results = (objType == "user" && typeof results==="object")
          ? results.users
          : ((objType == "group" && typeof results==="object")
          ? results.groups
          : results);

        log.debug("Found AD results for object type " + objType + ": ",results);
        return res.json({success:true, objects:results});
        });
      } else return res.json({success:false, error:"Please provide search text to search for an AD object."});

      break;

      case "addComment":
        if (!A.isLoggedIn()) return res.json({success:false, error:"You must be logged in to add a comment. Please log in above and try again."});

        var comment = info.comment;

        comment.username = A.username;
        comment.firstname = A.getFirstname();
        comment.lastname = A.getLastname();
        comment.email = A.getEmail();
        comment.date = new Date();

        config.mongodb.db.collection("wikicontent").update({path:wiki.path},{$push:{comments:comment}},function(err) {
          if (err) {
            res.json({success:false});
            return log.error(err);
          }

          res.json({success:true, comment:comment});

          audit.log({type:"Add Page Comment", additional:{path:wiki.path,comment:comment}});
          wiki.event({type:"addpagecomment", params:{comment:comment}},function(e,result) {if (e) log.error(e);});
        });

        break;

    case "spreadsheetToTable":

      break;

    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
}
