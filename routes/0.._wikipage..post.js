(function(req,res) {
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
  
  switch(info.type) {
    case "init":
      async.parallel([
        function(callback) {
          wiki.getPage(function(e,pageInfo) {
            callback(e,pageInfo);
          })
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
          wiki.getSubPages(function(e,oPages) {
            callback(e,oPages);
          });
        },
        function(callback) {
          Access.isPageAdmin({username:username, path:wiki.path},function(e,isAdmin) {
            callback(e,isAdmin);
          });
        },
        function(callback) {
          Access.isWikiAdmin(username,function(e,isAdmin) {
            callback(e,isAdmin);
          });
        },
        function(callback) {
          wiki.getPage({archive:true, filters:{path:wiki.path}},function(e,pageInfo) {
            callback(e,pageInfo);
          })
        },
        function(callback) {
          config.mongodb.db.collection("event_types").find({scope:"page"}).sort({type:1}).toArray(function(e,types) {
            callback(e,types);
          });
        },
        function(callback) {
          wiki.getPage({filters:{aliasfor:wiki.path},fields:{path:1,_id:0}},function(e,aliases) {
            callback(e,aliases);
          })
        },
      ],
        function(err,results) {
          if (err) res.json({success:false, error:err});
          else {
            var pageInfo = results[0];
            var validated = results[1];
            var templates = results[2];
            var oPages = results[3];
            var canUpdate = results[4] || results[5] || false;
            var pageArchive = results[6];
            var eventTypes = results[7];
            var aliases = results[8];
            
            if (!validated) res.json({success:false, protected:true});
            else {
              var oRet;
              if (!pageInfo.length) {
                oRet = {success:true, exists:false, updateable:canUpdate, html:"", markdown:"", versions:pageArchive};
              } else {
                oRet = {
                  success: true,
                  exists: true,
                  updateable: canUpdate,
                  description: pageInfo[0].description,
                  html: pageInfo[0].content_html,
                  markdown: pageInfo[0].content_markdown,
                  widgets: pageInfo[0].widgets,
                  lastUpdate: pageInfo[0].updated,
                  person: pageInfo[0].updatedBy,
                  versions: pageArchive,
                  tags: pageInfo[0].tags,
                  pageFiles: pageInfo[0].files,
                  password: pageInfo[0].password,
                  pageadmins: (typeof pageInfo[0].settings==="object") ? pageInfo[0].settings.admins : [],
                  pageEvents: pageInfo[0].events,
                  eventTypes: eventTypes.map(function(t) {return t.type}),
                  pageAliases: aliases.map(function(t) {return t.path})
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
              if (Object.size(oPages)) oRet.subpages = oPages;
              
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
          }
        }
      );
      
      break;
      
    case "update":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to update wiki pages."});
      else {        
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
            Access.isPageAdmin({username:username, path:wiki.path},function(e,isAdmin) {
              callback(e,isAdmin);
            });
          },
          function(callback) {
            Access.isWikiAdmin(username,function(e,isAdmin) {
              callback(e,isAdmin);
            });
          }
        ],
          function(err,results) {
            if (err) res.json({success:false, error:err});
            else {
              var current = results[0];
              var validated = results[1];
              var canUpdate = results[2] || results[3] || false;
              
              if (!validated) res.json({success:false, error:"You cannot edit a password-protected page until you have authenticated with it."});
              else if (!canUpdate) res.json({success:false, error:"You cannot update this page as you do not have appropriate rights to update it. Please contact the page administrators to get access."});
              else {
                var saveData = {
                  "$set": {
                    path: wiki.path,
                    content_html: info.html,
                    content_markdown: info.markdown,
                    updated: new Date(),
                    updatedBy: {username: username}
                  }
                };
                
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
                      log.error(err);
                      res.json({success:false, error:"There was an error saving your information. Please try again."});
                    } else {
                      var mailInfo = results[4];
                      if (!mailInfo) log.debug("The page update subscriber e-mail did not send either because there are no subscribers or the template is corrupted.");
                      
                      res.json({success:true});
                    }
                  }
                );
              }
            }
          }
        );
      }
      break;
      
    case "delete":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to delete a wiki page."});
      else {
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
              log.error(err);
            } else {
              var isAdmin = results[0];
              
              if (!isAdmin) res.json({success:false, error:"You must be a page admin to delete a wiki page."});
              else {
                wiki.deletePage(function(e) {
                  if (e) {
                    res.json({success:false, error:e});
                    log.error(err);
                  } else res.json({success:true});
                });
              }
            }
          }
        );
      }
    
      break;
      
    case "aliases":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to delete a wiki page."});
      else {
        var aliases = info.aliases || [];
        
        var aliasesOrig = aliases.map(function(a){return (a[0]=="/") ? a : "/"+a});;
        aliases = aliasesOrig.map(function(a){return {path:a}});
        
        var check = {$or:aliases};
        
        if (aliases.length) {
          async.parallel([
            function(callback) {
              Access.isAdmin({username:username, path:wiki.path},function(e,isAdmin) {
                callback(e,isAdmin);
              });
            },
            function(callback) {
              wiki.getPage({filters:check,fields:{path:1,aliasfor:1,_id:0}},function(_e,pages) {
                callback(_e,pages);
              });
            },
            function(callback) {
              wiki.getPage({filters:{aliasfor:wiki.path},fields:{path:1,aliasfor:1,_id:0}},function(_e,pages) {
                callback(_e,pages);
              });
            },
            function(callback) {
              try {
                var notAllowed = false;
                async.each(aliasesOrig,function(a) {
                  if (!wiki.allowedPath(a)) {
                    notAllowed = a;
                    return;
                  }
                });
                
                callback(null,notAllowed);
              } catch(e) {
                callback(e)
              }
              
            }
          ],
            function(err,results) {
              if (err) {
                res.json({success:false, error:err});
                log.error(err);
              } else {
                var isAdmin = results[0];
                var alreadyUsed = results[1];
                var currentAliases = results[2];
                var notAllowedPath = results[3];
                
                var currentAliasesOnlyPaths = currentAliases.map(function(c){return c.path});
                var aliasesToDelete = _.difference(currentAliasesOnlyPaths,aliasesOrig).map(function(a){return {path:a}});
                
                if (alreadyUsed.length) {
                  aliases = aliases.filter(function(a){return _.findIndex(alreadyUsed,function(used){return a.path == used.path}) == -1});
                  alreadyUsed = alreadyUsed.filter(function(a){return typeof a.aliasfor==="undefined" || a.aliasfor != wiki.path});
                }
                
                if (!isAdmin) res.json({success:false, error:"You must be a page admin to update the page aliases."});
                else {
                  if (notAllowedPath) {
                    res.json({success:false, error:"Your aliases were not saved because the following path is not allowed: " + notAllowedPath});
                  } else if (aliases.length || alreadyUsed.length) {
                    if (alreadyUsed.length) {
                      var inUseString = alreadyUsed.map(function(p){return p.path}).join(", ");
                      res.json({success:false, error:"Your aliases were not saved because the following are already in use: " + inUseString});
                    } else {
                      var docs = aliases.map(function(a) {
                        a.aliasfor = wiki.path;
                        return a;
                      });
                      
                      config.mongodb.db.collection("wikicontent").insert(docs,function(err,result) {
                        if (err) {
                          res.json({success:false, error:err});
                          log.error(err);
                        } else {                        
                          //delete aliases we no longer want
                          res.json({success:true});
                          
                          if (aliasesToDelete.length) {
                            config.mongodb.db.collection("wikicontent").remove({$or:aliasesToDelete},function(e) {
                              if (e) log.error(e);
                            });
                          }
                        }
                      });
                    }
                  } else {
                    res.json({success:true});
                    
                    //delete all aliases since there are none now
                    if (!aliasesOrig.length) {
                      config.mongodb.db.collection("wikicontent").remove({aliasfor:wiki.path},function(e) {
                        if (e) log.error(e);
                      });
                    } else if (aliasesToDelete.length) {
                      config.mongodb.db.collection("wikicontent").remove({$or:aliasesToDelete},function(e) {
                        if (e) log.error(e);
                      });
                    }
                  }
                }
              }
            }
          );
        } else {
          res.json({success:true});
          
          //delete all aliases since there are none now
          config.mongodb.db.collection("wikicontent").remove({aliasfor:wiki.path},function(e) {
            if (e) log.error(e);
          });
        }
      }
      
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
            log.error(err);
            res.json({success:false, error:err});
          } else {
            var isAdmin = results[0];
            
            if (!isAdmin) res.json({success:false, error:"You need to be a page admin to perform this function."});
            else {
              config.mongodb.db.collection("wikicontent").update({ path:wiki.path },{ $unset:{events:1} },function(_e) {
                config.mongodb.db.collection("wikicontent").update({ path:wiki.path },{ $set:{events:events} },function(__e) {
                  var error = _e || __e || null;
                  
                  if (error) res.json({success:false, error:error});
                  else res.json({success:true});
                });
              });
            }
          }
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
        
        config.mongodb.db.collection("accounts").update({username:username},{$pull:{drafts: {path:wiki.path}}},
          function(e,result) {
            if (e) {
              log.error(e);
              res.json({success:false, error:"There was an error saving your draft. Please try again."});
            } else {
              if (onlyDelete) res.json({success:true});
              else {
                config.mongodb.db.collection("accounts").update({username:username},saveData,{upsert:true},
                function(er,result) {
                  if (er) {
                    log.error(er);
                    res.json({success:false, error:"There was an error saving your draft. Please try again."});
                  } else {
                    res.json({success:true});
                    
                    audit.log({type:"Update Draft", additional:{path:wiki.path}});
                  }
                });
              }
            }
          });
      }
      
      break;
    
    case "getTemplate":
      var dir = __dirname + "/views/wikitemplates/";
      var template = info.template;
      var p = dir + template;
      var ext = path.extname(p);
      var retHtml;
      
      if (ext == ".jade") retHtml = jade.renderFile(p);
      else retHtml = fs.readFileSync(p,{encoding:"utf8"});
      
      res.json({success:true, html:html.prettyPrint(retHtml,{indent_size:2})});
      
      break;
    
    case "wordToHtml":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        if (/.+openxmlformats\-officedocument.+/.test(fileType)) {
          mammoth.convertToHtml({path:filePath}).then(function(result) {
            var returnedResult = result.value.replace(/\<table\>/g,"<table class='table table-bordered table-striped'>");
            res.json({wordsuccess:true, html:html.prettyPrint(returnedResult,{indent_size:2}), debug: result});
            
            audit.log({type:"Word To HTML Conversion", additional:{filePath:filePath}});
          }).catch(function(err) {
            log.error(err);
            res.json({wordsuccess:false, error:"Uh oh, there was an issue trying to convert your document. Please make sure it's a valid Microsoft Word document and try again."});
          });
        } else {
          res.json({wordsuccess:false, error:"Uh oh, this doesn't appear to be a valid Microsoft Word document that we can parse and convert. Please try again."});
        }
      }
      
      break;
    
    case "uploadFile":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        var fh = new FileHandler({db:config.mongodb.db});
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
      }
      
      break;
    
    case "deleteFile":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        var fileName = info.filename;
        
        var fh = new FileHandler({db:config.mongodb.db});
        fh.deleteFile({filename:fileName},function(e) {
          if (e) log.error(e);
          
          var fileScope = info.scope;
          var coll = (fileScope=="page") ? "wikicontent" : "accounts";
          var filter = (fileScope=="page") ? {path:wiki.path} : {username:username};
          config.mongodb.db.collection(coll).update(filter,{ "$pull": { files:{ filename:fileName } }},{upsert:true},function(err) {
            if (err) {
              log.error(err);
              res.json({success:false, error:err});
            } else res.json({success:true});
            
            audit.log({type:"Delete File From GridFS", additional:{fileName:fileName}});
          });
        });
        
        break;
      }
    
    case "updatePath":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        var newPath = info.newPath;
        newPath = (newPath.indexOf("/") == 0) ? newPath : "/"+newPath;
        
        async.parallel([
          function(callback) {
            callback(null,wiki.allowedPath(newPath));
          },
          function(callback) {
            wiki.getPage({filters:{path:newPath},fields:{path:1}},function(e,page) {
              callback(e,page);
            });
          },
          function(callback) {
            Access.isPageAdmin({username:username, path:wiki.path},function(e,isAdmin) {
              callback(e,isAdmin);
            });
          },
          function(callback) {
            Access.isWikiAdmin(username,function(e,isAdmin) {
              callback(e,isAdmin);
            });
          }
        ],
          function(err,results) {
            if (err) res.json({success:false, error:err});
            else {
              var allowed = results[0];
              var page = results[1];
              var canUpdate = results[2] || results[3] || false;
              
              if (!canUpdate) res.json({success:false, error:"You cannot update the path as you do not have appropriate rights. Contact the page administrator to get access."});
              else if (!allowed) res.json({success:false, error:"Path " + newPath + " is not a valid path to change to. Please try another path."});
              else if (page.length) res.json({success:false, error:"The path, " + newPath + ", already exists and can't be overwritten. Please try another path or delete/move the page at " + newPath + " and try again."});
              else {
                config.mongodb.db.collection("wikicontent").update({path:wiki.path},{$set:{path:newPath}},function(err) {
                  if (err) res.json({success:false, error:err});
                  else res.json({success:true});
                  
                  audit.log({type:"Update Page Path", additional:{formerPath:wiki.path, newPath:newPath}});
                  wiki.event({type:"updatepagepath", params:{username:username, formerPath:wiki.path, newPath:newPath}},function(e,result) {if (e) log.error(e);});
                });
              }
            }
          }
        );
      }
      
      break;
    
    case "updatePageSetting":
      if (!A.isLoggedIn()) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        var key = info.key;
        var val = info.value;
        
        if (key=="widgets") for (var _k in val) val[_k].enabled = (val[_k].enabled=="false" || val[_k].enabled=="0") ? false : (!!val[_k].enabled);
        
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
      
      break;
    
    case "spreadsheetToTable":
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})