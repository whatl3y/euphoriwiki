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
        return log.error(err);
      }

      var isAdmin = results[0];

      if (!isAdmin) return res.json({success:false, error:"You need to be an admin."});

      switch(info.type) {
        case "init":
          async.parallel([
            function(callback) {
              config.mongodb.db.collection("themes").find({type:"global"}).toArray(function(e,themeInfo) {
                callback(e,themeInfo);
              });
            }
          ],
            function(err,results) {
              if (err) {
                res.json({success:false, error:err});
                return log.error(err);
              }

              var themeInfo = (results[0] instanceof Array && results[0].length) ? results[0][0] : {};

              var logo = themeInfo.header_logo;
              var homeBody = themeInfo.home_page;

              return res.json({success:true, logo:logo, homeBody:homeBody});
            }
          );

          break;

        case "updateLogo":
          var currentLogoFileName = info.currentLogoFile;
          var link = info.logoLink || "";

          var fh = new FileHandler({db:config.mongodb.db});

          async.waterfall([
            function(callback) {
              if (!fileName) return callback();

              if (currentLogoFileName) {
                fh.deleteFile({filename:currentLogoFileName},function(e) {
                  return callback(e);
                });

                return;
              }

              return callback();
            },
            function(callback) {
              if (!fileName) return callback(null,currentLogoFileName);

              fh.uploadFile({filename:fileName, path:filePath},function(err,newFileName) {
                return callback(err,newFileName);
              });
            },
            function(logoFileName,callback) {
              var saveObj = {$set:{}};

              if (logoFileName !== currentLogoFileName) {
                saveObj.$set.header_logo = logoFileName;
              }
              saveObj.$set.header_logo_link = link || "";

              config.mongodb.db.collection("themes").update({type:"global"},saveObj,{upsert:true},function(err) {
                return callback(err,logoFileName);
              })
            }
          ],
            function(err,logoFileName) {
              if (err) {
                res.json({success:false, error:err});
                return log.error(err);
              }

              return res.json({success:true, newLogo:logoFileName});
            }
          );

          break;

        case "updateMainBody":
          if (!fileName) return res.json({success:false, error:"Please make sure you have uploaded a file to be replaced as your new home page."});

          var currentBodyFile = info.currentFile || null;
          var fh = new FileHandler({db:config.mongodb.db});

          async.waterfall([
            function(callback) {
              if (currentBodyFile) {
                fh.deleteFile({filename:currentBodyFile},function(e) {
                  return callback(e);
                });

                return;
              }

              return callback();
            },
            function(callback) {
              fh.uploadFile({filename:fileName, path:filePath},function(err,newFileName) {
                return callback(err,newFileName);
              });
            },
            function(mainFileName,callback) {
              config.mongodb.db.collection("themes").update({type:"global"},{$set:{home_page:mainFileName}},{upsert:true},function(err) {
                return callback(err,mainFileName);
              })
            }
          ],
            function(err,mainFileName) {
              if (err) {
                res.json({success:false, error:err});
                return log.error(err);
              }

              return res.json({success:true, homeBody:mainFileName});
            }
          );

          break;

        default:
          res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
      }
    }
  );
})
