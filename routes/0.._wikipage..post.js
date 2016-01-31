(function(req,res) {
  var info = req.body;
  
  if (info.file) {
    var fileInfo = info.file;
    var fileName = fileInfo.name;
    var filePath = fileInfo.path;
    var fileType = fileInfo.type;
  }
  
  var username = (req.session.loggedIn) ? req.session.sAMAccountName.toLowerCase() : null;
  var wiki = new WikiHandler({path:info.page});
  
  switch(info.type) {
    case "init":
      wiki.getPage(function(_e,pageInfo) {
        if (_e) res.json({success:false, error:_e});
        else {
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
            tags: pageInfo[0].tags
          };
          
          wiki.getSubPages(function(_e,pages) {
            if (_e) log.error(_e);
            else if (pages.length) oRet.subpages = pages;
            
            if (req.session.loggedIn) {
              config.mongodb.db.collection("accounts").find({username:username},{files: {"$slice":100}}).toArray(function(_e,userInfo) {
                if (_e) log.error(_e);
                else if (!userInfo.length) log.trace("Tried getting files for user " + username + " but this user does not have an account record yet.");
                else oRet = Object.merge(oRet,{userFiles:userInfo[0].files});
                
                res.json(oRet);
              });
            } else {
              res.json(oRet);
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
          if (current.length) saveData["$push"] = {history: current[0]};
          
          config.mongodb.db.collection("wikicontent").update({ path:wiki.path },saveData,{ upsert:true },
            function(err,doc) {
              if (err) res.json({success:false, error:"There was an error saving your information. Please try again.", debug:err});
              else res.json({success:true});
            }
          );
        });
      }
      break;
    
    case "wordToHtml":
      if(/.+openxmlformats\-officedocument.+/.test(fileType)) {
        mammoth.convertToHtml({path:filePath}).then(function(result) {
          res.json({wordsuccess:true, html:result.value, debug: result});
        });
      } else {
        res.json({wordsuccess:false, error:"Uh oh, this doesn't appear to be a valid Microsoft Word document that we can parse and convert. Please try again."});
      }      
      
      break;
    
    case "uploadFile":
      var lastPeriod = fileName.lastIndexOf(".");
      var newFileName = fileName.substring(0,lastPeriod) + "_" + Date.now() + fileName.substring(lastPeriod);
      
      var gfs = Grid(config.mongodb.db, mongo);
      var writeStream = gfs.createWriteStream({filename: newFileName});
      
      writeStream.on("error",function(err) {
        log.error(err);
        res.json({filesuccess:false, error:err});
      });
      
      writeStream.on("close",function(file) {
        log.debug("File created and piped to GridFS. Filename: "+newFileName);
        
        var newFileInfo = {
          uploadedTime: new Date(),
          origFilename: fileName,
          filename: newFileName
        };
        
        res.json({filesuccess:true, fileInfo:newFileInfo});
        
        config.mongodb.db.collection("accounts").update({username:username},{
          "$push": {
            files: newFileInfo
          }
        },{upsert:true},function(err) {
          if (err) log.error(err);
        });
      });
      
      fs.createReadStream(filePath).pipe(writeStream);
      
      break;
    
    case "deleteFile":
      var fileName = info.filename;
      
      var gfs = Grid(config.mongodb.db, mongo);
      gfs.remove({filename:fileName},function(err) {
        if (err) log.error(err);
        
        config.mongodb.db.collection("accounts").update({username:username},{ "$pull": { files:{ filename:fileName } }},{upsert:true},function(err) {
          if (err) {
            log.error(err);
            res.json({success:false, error:err});
          } else res.json({success:true});
        })
      });
      
      break;
    
    case "updatePath":
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
      
      break;
    
    case "updatePageSetting":
      var key = info.key;
      var val = info.value;
      
      if (key=="widgets") for (var _k in val) val[_k].enabled = (val[_k].enabled=="false" || val[_k].enabled=="0") ? false : (!!val[_k].enabled);
      
      var o = {};
      o[key] = val;
      
      config.mongodb.db.collection("wikicontent").update({path:wiki.path},{$set:o},{ upsert:true },function(err) {
        if (err) res.json({success:false, error:err});
        else res.json({success:true});
      });
      
      break;
    
    case "spreadsheetToTable":
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})