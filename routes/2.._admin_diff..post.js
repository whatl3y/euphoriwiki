(function(req,res) {
  var info = req.body;
  
  var D = new DirectoryProcessor();
  var A = new Auth({session:req.session});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var username = A.username;
  
  switch(info.type) {
    case "init":
      config.mongodb.db.collection("processed_directory").aggregate([
        {
          $project: {
            directory: 1,
            fulldirectory: 1,
            date: 1,
            hostname: 1,
            numberFiles: {
              $size: "$processed"
            }
          }
        }
      ],function(_e,processed) {
        if (_e) res.json({success:false, error:_e});
        else res.json({success:true, processes:processed});
      });
      
      break;
    
    case "checkdir":
      var directory = info.directory;
      
      if (D.fileOrDirExists(directory)) {
        res.json({success:true});
      } else {
        res.json({success:false, error:"We could not find the directory you entered."});
      }
      
      break;
      
    case "process":
      if (!A.isLoggedIn()) res.json({success:false, error:"You need to be logged in to process a directory."});
      else {
        var directory = info.directory;
        
        if (D.fileOrDirExists(directory)) {
          D.processDir(directory,true,function(err,obj) {
            if (err) res.json({success:false, error:err});
            else {
              var now = Date.now();
              
              config.mongodb.db.collection("processed_directory").insert({
                directory: directory,
                fulldirectory: (path.isAbsolute(directory)) ? directory : path.join(__dirname,directory),
                date: new Date(),
                hostname: os.hostname(),
                processed: obj
              },function(e,result) {
                if (e) res.json({success:false, error:e});
                else {
                  res.json({success:true, message:"Successfully processed your directory at: " + directory});
                }
              });
              /*var jsonFileName = now + ".json";
              var jsonFilePath = path.join(__dirname,"files","diff",jsonFileName);
              
              fs.writeFile(jsonFilePath,JSON.stringify(obj),
                function(e) {
                  if (e) res.json({success:false, error:e});
                  else res.json({success:true, message:"Your directory was successfully processed. The processed JSON file can be located at: " + jsonFileName});
                }
              );*/
            }
          });
        } else {
          res.json({success:false, error:"We could not find the directory you entered."});
        }
      }
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})