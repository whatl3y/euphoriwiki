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
        
        if (!isAdmin) return res.json({success:false, error:"You need to be an admin."});
        
        switch(info.type) {
          case "init":            
            async.parallel([
              function(callback) {
                config.mongodb.db.collection("template_types").find({ active:{$ne:false} }).sort( {type:1, name:1} ).toArray(function(e,templates) {
                  callback(e,templates);
                });
              },
              function(callback) {
                config.mongodb.db.collection("wikitemplates").find({ active:{$ne:false} }).sort( {type:1, name:1} ).toArray(function(e,templates) {
                  callback(e,templates);
                });
              }
            ],
              function(e,results) {
                if (e) {
                  res.json({success:false, error:e});
                  return log.error(e);
                }
                
                var templateTypes = results[0];
                var templates = results[1];
                
                res.json({success:true, templateTypes:templateTypes, templates:templates});
              }
            );
            
            break;
          
          case "addOrEditTemplate":
            var fh = new FileHandler({db:config.mongodb.db});
            
            break;
          
          case "deleteTemplate":
            
          
            break;
          
          default:
            res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
        }
      }
    }
  );
})