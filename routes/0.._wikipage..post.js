(function(req,res) {
  var info = req.body;
  
  if (info.file) {
    var fileInfo = info.file;
    var fileName = fileInfo.name;
    var filePath = fileInfo.path;
    var fileType = fileInfo.type;
  }
  
  var username = (req.session.loggedIn) ? req.session.sAMAccountName.toLowerCase() : null;
  var wiki = new WikiHandler({path:decodeURI(info.page)});
  
  switch(info.type) {
    case "init":
      wiki.getPage(function(_e,pageInfo) {
        if (_e) res.json({success:false, error:_e});
        else {
          wiki.validatePassword({session:req.session, info:pageInfo[0]},function(e,validated) {
            if (e) res.json({success:false, error:e});
            else {
              if (validated) {
                wiki.getTemplates(function(error,templates) {
                  if (error) log.error("Error getting templates for page: " + error);
                  
                  var oRet;
                  if (!pageInfo.length) oRet = {success:true, exists:false, html:"", markup:""};
                  else oRet = {
                    success: true,
                    exists: true,
                    description: pageInfo[0].description,
                    html: pageInfo[0].content_html,
                    markup: pageInfo[0].content_markup,
                    widgets: pageInfo[0].widgets,
                    lastUpdate: pageInfo[0].updated,
                    person: pageInfo[0].updatedBy,
                    versions: pageInfo[0].history,
                    tags: pageInfo[0].tags,
                    pageFiles: pageInfo[0].files,
                    password: pageInfo[0].password
                  };
                  
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
                  
                  //add templates to what is returned
                  oRet.pageTemplates = templates || [];
                  
                  wiki.getSubPages(function(_e,oPages) {
                    if (_e) log.error(_e);
                    else if (Object.size(oPages)) oRet.subpages = oPages;
                    
                    if (req.session.loggedIn) {
                      config.mongodb.db.collection("accounts").find({username:username},{files:{$slice:100}, drafts:{$elemMatch:{path:wiki.path}}}).toArray(function(_e,userInfo) {
                        if (_e) log.error(_e);
                        else if (!userInfo.length) log.trace("Tried getting files for user " + username + " but this user does not have an account record yet.");
                        else oRet = Object.merge(oRet,{userFiles:userInfo[0].files, draft:(userInfo[0].drafts instanceof Array)?userInfo[0].drafts[0]:false});
                        
                        res.json(oRet);
                      });
                    } else {
                      res.json(oRet);
                    }
                  });
                });
              } else {
                res.json({success:false, protected: true});
              }
            }
          });
        }
      });
      
      break;
      
    case "update":
      if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to update wiki pages."});
      else {
        var saveData = {
          "$set": {
            path: wiki.path,
            content_html: info.html,
            content_markdown: info.markdown,
            updated: new Date(),
            updatedBy: {
              firstname: req.session.givenName,
              lastname: req.session.sn,
              username: username
            }
          }
        };
        
        wiki.getPage(function(_e,current) {
          wiki.validatePassword({session:req.session, info:current[0]},function(e,validated) {
            if (e) res.json({success:false, error:e});
            else {
              if (validated) {
                if (current.length) saveData["$push"] = {history: current[0]};
                
                config.mongodb.db.collection("wikicontent").update({ path:wiki.path },saveData,{ upsert:true },
                  function(err,doc) {
                    if (err) res.json({success:false, error:"There was an error saving your information. Please try again.", debug:err});
                    else res.json({success:true});
                    
                    config.mongodb.db.collection("accounts").update({username:username},{$pull:{drafts: {path:wiki.path}}},
                      function(e,result) {
                        if (e) log.error(e);
                      });
                  }
                );
              } else {
                res.json({success:false, error:"You cannot edit a password-protected page until you have authenticated with it."});
              }
            }
          });
        });
      }
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
        }
      );
      
      break;
    
    case "like":
      if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to like a wiki page."});
      else {
        if (info.unlike) {
          config.mongodb.db.collection("wikicontent").update({ path:wiki.path },{$inc:{"likes.number":-1},$pull:{"likes.info":{username:username}}},{ upsert:true },
            function(err,doc) {
              if (err) res.json({success:false, error:err});
              else res.json({success:true});
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
            }
          );
        }
      }
      
      break;
    
    case "updateDraft":
      var onlyDelete = (info.delete==="false") ? false : (info.delete || false);
      
      if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to update wiki pages."});
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
      if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        if (/.+openxmlformats\-officedocument.+/.test(fileType)) {
          mammoth.convertToHtml({path:filePath}).then(function(result) {
            var returnedResult = result.value.replace(/\<table\>/g,"<table class='table table-bordered table-striped'>");
            res.json({wordsuccess:true, html:html.prettyPrint(returnedResult,{indent_size:2}), debug: result});
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
      if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
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
            });
          }
        });
      }
      
      break;
    
    case "deleteFile":
      if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
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
          });
        });
        
        break;
      }
    
    case "updatePath":
      if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        var newPath = info.newPath;
        newPath = (newPath.indexOf("/") == 0) ? newPath : "/"+newPath;
        
        if (wiki.allowedPath(newPath)) {
          wiki.getPage({filters:{path:newPath},fields:{path:1}},function(e,page) {
            if (e) res.json({success:false, error:"We couldn't update your path. Please try again."});
            else {
              if (page.length) res.json({success:false, error:"The path, " + newPath + ", already exists and can't be overwritten. Please try another path or delete/move the page at " + newPath + " and try again."});
              else {
                config.mongodb.db.collection("wikicontent").update({path:wiki.path},{$set:{path:newPath}},function(err) {
                  if (err) res.json({success:false, error:err});
                  else res.json({success:true});
                })
              }
            }
          });
        } else {
          res.json({success:false, error:"Path " + newPath + " is not a valid path to change to. Please try another path."});
        }
      }
      
      break;
    
    case "updatePageSetting":
      if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to perform this function. Please log in and try again."});
      else {
        var key = info.key;
        var val = info.value;
        
        if (key=="widgets") for (var _k in val) val[_k].enabled = (val[_k].enabled=="false" || val[_k].enabled=="0") ? false : (!!val[_k].enabled);
        
        var o = {};
        o[key] = val;
        
        config.mongodb.db.collection("wikicontent").update({path:wiki.path},{$set:o},{ upsert:true },function(err) {
          if (err) res.json({success:false, error:err});
          else res.json({success:true});
        });
      }
      
      break;
    
    case "spreadsheetToTable":
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})