import bunyan from "bunyan"
import mongodb from "mongodb"
import _ from "underscore"
import async from "async"
import Auth from "../libs/Authentication.js"
import AccessManagement from "../libs/AccessManagement.js"
import Audit from "../libs/Audit.js"
import WikiHandler from "../libs/WikiHandler.js"
import FileHandler from "../libs/FileHandler.js"
import config from "../config.js"

const log = bunyan.createLogger(config.logger.options())

module.exports = function(req,res) {
  const ObjectId = mongodb.ObjectID;

  var info = req.body;
  if (info.file) {
    var fileInfo = info.file;
    var fileName = fileInfo.name;
    var filePath = fileInfo.path;
    var fileType = fileInfo.type;
  }

  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db:config.mongodb.db});
  var wiki = new WikiHandler();
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
              config.mongodb.db.collection("template_types").find({ active:{$ne:false} }).sort( {type:1, name:1} ).toArray(function(e,types) {
                callback(e,types);
              });
            },
            function(callback) {
              config.mongodb.db.collection("wikitemplates").find({ active:{$ne:false} }).sort( {type:1, name:1} ).toArray(function(e,templates) {
                callback(e,templates);
              });
            },
            function(callback) {
              wiki.getExternalDatasources(function(e,datasources) {
                callback(e,datasources);
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
              var datasources = results[2];

              res.json({success:true, templateTypes:templateTypes, templates:templates, datasources:datasources});
            }
          );

          break;

        case "addOrEditTemplate":
          var fh = new FileHandler({db:config.mongodb.filedb});

          info.template = JSON.parse(info.template);
          var templateId = info.template._id || null;
          var templateName = info.template.name;
          var templateType = info.template.type;
          var templateFileName = info.template.file;
          var isEasyConfig = info.template.isEasyConfig;
          var templateConfig = _.toArray(info.template.config);

          var createOrModify = function(newFileName) {
            var data = {$set: {updated: new Date()}};

            data["$set"].file = newFileName || templateFileName || "NOFILE";

            if (templateName) data["$set"].name = templateName;
            if (templateType) data["$set"].type = templateType;
            if (isEasyConfig) data["$set"].isEasyConfig = isEasyConfig;
            if (templateConfig) data["$set"].config = Object.removeDollarKeys(templateConfig);

            async.series([
              function(callback) {
                config.mongodb.db.collection("wikitemplates").find({ _id:ObjectId(templateId) },{ file:1 }).toArray(function(e,page) {
                  callback(e,page);
                });
              },
              function(callback) {
                config.mongodb.db.collection("wikitemplates").findAndModify({ _id:ObjectId(templateId) },[],data,{ upsert:true, new:true },function(e,doc) {
                  callback(e,doc);
                });
              }
            ],
              function(err,results) {
                if (err) {
                  res.json({success:false, error:err});
                  return log.error(err);
                }

                var oldTemplate = results[0];
                var updatedTemplate = results[1].value || results[1];

                res.json({success:true, template:updatedTemplate});

                if (oldTemplate.length && oldTemplate[0].file && newFileName) {
                  fh.deleteFile({filename:oldTemplate[0].file},function(e) {
                    if (e) log.error(e);
                  });
                }
              }
            );
          };

          if (info.file) {
            fh.uploadFile({path:filePath, filename:fileName},function(e,newFileName) {
              if (e) {
                res.json({success:false, error:e});
                return log.error(err);
              }

              createOrModify(newFileName);
            });
          } else createOrModify();

          break;

        case "deleteTemplate":
          var fh = new FileHandler({db:config.mongodb.filedb});

          async.parallel([
            function(callback) {
              fh.deleteFile({filename:info.file},function(err) {
                callback(err);
              });
            },
            function(callback) {
              config.mongodb.db.collection("wikitemplates").remove({_id:ObjectId(info._id)},function(err) {
                callback(err);
              })
            }
          ],
            function(err,results) {
              if (err) {
                res.json({success:false, error:(typeof err === "string") ? err : "There was a problem deleting the template. Please try again."});
                return log.error(err);
              }

              res.json({success:true});
            }
          );

          break;

        default:
          res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
      }
    }
  );
}
