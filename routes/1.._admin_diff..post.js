var fs = require("fs");
var os = require("os");
var path = require("path");
var Auth = require("../libs/Authentication.js");
var AccessManagement = require("../libs/AccessManagement.js");
var DirectoryProcessor = require("../libs/DirectoryProcessor.js");
var Audit = require("../libs/Audit.js");
var WikiHandler = require("../libs/WikiHandler.js");
var ChildProcesses = require("../libs/ChildProcesses.js");
var GetHTML = require("../libs/GetHTML.js");
var config = require("../libs/config.js");
var log = require("bunyan").createLogger(config.logger.options());

module.exports = function(req,res) {
  var info = req.body;

  var D = new DirectoryProcessor();
  var A = new Auth({session:req.session});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});

  var username = A.username;
  var wiki = new WikiHandler({path:"/directory"});

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
      if (!A.isLoggedIn()) return res.json({success:false, error:"You need to be logged in to process a directory."});

      var directory = info.directory;
      var fullDirectory = (path.isAbsolute(directory)) ? directory : path.join(__dirname,'..',directory);

      new ChildProcesses({command:"bin/processdir", args:[fullDirectory], timeout:120}).run(function(err,obj) {
        if (err) res.json({success:false, error:e});
        else {
          var now = Date.now();

          config.mongodb.db.collection("processed_directory").insert({
            directory: directory,
            fulldirectory: fullDirectory,
            date: new Date(),
            hostname: os.hostname(),
            processed: obj
          },function(e,result) {
            if (e) return res.json({success:false, error:e});

            return res.json({success:true, message:"Successfully processed your directory at: " + directory});
          });
          /*var jsonFileName = now + ".json";
          var jsonFilePath = path.join(__dirname,"..","files","diff",jsonFileName);

          fs.writeFile(jsonFilePath,JSON.stringify(obj),
            function(e) {
              if (e) res.json({success:false, error:e});
              else res.json({success:true, message:"Your directory was successfully processed. The processed JSON file can be located at: " + jsonFileName});
            }
          );*/
        }
      });

      break;

    case "createPages":
      if (!A.isLoggedIn()) res.json({success:false, error:"You need to be logged in to process a directory."});
      else {
        var directory = info.directory;
        var now = Date.now();

        if (D.fileOrDirExists(directory)) {
          D.processDir({dirpath:directory, recurse:true, processIndividually:true, encoding:"binary"},
            function(err,result) {
              if (err) {
                log.error(err);
                res.json({success:false, error:err});
              } else res.json({success:true, message:"Successfully processed your directory at: " + directory});
            },
            function(file) {
              var gH = new GetHTML();

              if (typeof file.info!=="undefined") {
                var pageData = "<div>" + gH.normalStringToHtml(file.info.data) + "</div>";
                var pagePath = wiki.path + "/" + now + "/" + file.parentdir.replace(/\\/g,"/") + "/" + file.filename;

                var saveData = {
                  "$set": {
                    path: pagePath,
                    content_html: pageData,
                    updated: new Date(),
                    updatedBy: {username: username}
                  }
                };

                //create/update page
                config.mongodb.db.collection("wikicontent").update({ path:wiki.path },saveData,{ upsert:true },
                  function(err,doc) {
                    if (err) log.error(err);
                    else log.debug("Successfully created page dynamically: " + pagePath);
                  }
                );
              } else {
                log.info("File not processed:",file);
              }
            }
          );
        } else {
          res.json({success:false, error:"We could not find the directory you entered."});
        }
      }

      break;

    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
}
