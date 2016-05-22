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
              res.json({success:true});
              
              break;
            
            default:
              res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
          }
        }
      }
    }
  );
})