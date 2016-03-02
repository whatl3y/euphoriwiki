(function(req,res) {
  var info = req.body;
  if (info.file) {
    var fileInfo = info.file;
    var fileName = fileInfo.name;
    var filePath = fileInfo.path;
    var fileType = fileInfo.type;
  }
  
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db:config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var username = A.username;
  
  async.parallel([
    function(callback) {
      Access.isWikiAdmin(username,function(e,isAdmin) {
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
        
        if (!isAdmin) res.json({success:false, error:"You need to be an admin."});
        else {
          switch(info.type) {
            case "init":
              config.mongodb.db.collection("wiki_modules").find({}).toArray(function(e,modules) {
                if (e) {
                  res.json({success:false, error:e});
                  log.error(e);
                } else {
                  res.json({success:true, modules:modules});
                }
              });
              
              break;
            
            case "uploadModule":
              var fh = new FileHandler({db:config.mongodb.db});
              
              info.module = JSON.parse(info.module);
              var moduleKey = info.module.key;
              var moduleName = info.module.name;
              var moduleDescription = info.module.description;
              var moduleConfig = (typeof info.module.config==="string") ? info.module.config.split(",") : [];
              var moduleCode = info.module.code || "";
              
              var createOrModify = function(newFileName) {
                var data = {
                  key: moduleKey,
                  name: moduleName,
                  description: moduleDescription,
                  config: moduleConfig,
                  code: moduleCode,
                  updated: new Date()
                };
                if (newFileName) data.template = newFileName;
                
                config.mongodb.db.collection("wiki_modules").findAndModify({ key:moduleKey },[],data,{ upsert:true, new:true },function(e,doc) {
                  if (e) {
                    res.json({success:false, error:e});
                    log.error(err);
                  } else {
                    res.json({success:true, module:doc});
                  }
                });
              };
              
              if (info.file) {
                fh.uploadFile({path:filePath, filename:fileName},function(e,newFileName) {
                  if (e) {
                    res.json({success:false, error:e});
                    log.error(err);
                  } else {
                    createOrModify(newFileName);
                  }
                });
              } else {
                createOrModify();
              }
            
              break;
            
            case "deleteModule":
              var fh = new FileHandler({db:config.mongodb.db});
              var moduleKey = info.key;
              var moduleTemplate = info.template;
              
              async.parallel([
                function(callback) {
                  if (moduleTemplate) fh.deleteFile({filename:moduleTemplate},callback);
                  else callback();
                },
                function(callback) {
                  config.mongodb.db.collection("wiki_modules").remove({ key:moduleKey },callback);
                }
              ],
                function(e,results) {
                  if (e) {
                    res.json({success:false, error:e});
                    log.error(err);
                  } else res.json({success:true});
                }
              );
            
              break;
            
            default:
              res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
          }
        }
      }
    }
  );
})