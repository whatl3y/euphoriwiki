var async = require("async");
var Auth = require("../libs/Authentication.js");
var AccessManagement = require("../libs/AccessManagement.js");
var Audit = require("../libs/Audit.js");
var WikiHandler = require("../libs/WikiHandler.js");
var FileHandler = require("../libs/FileHandler.js");
var config = require("../config.js");
var log = require("bunyan").createLogger(config.logger.options());

module.exports = function(req,res) {
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
              var path = info.page || "";
              var wiki = new WikiHandler({path:decodeURI(path)});

              async.parallel([
                function(callback) {
                  wiki.getModules({filters:{}},function(e,modules) {
                    callback(e,modules);
                  });
                },
                function(callback) {
                  wiki.getModuleInstances(null,function(e,instances) {
                    callback(e,instances);
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

                  var modules = results[0];
                  var instances = results[1];
                  var externalDatasources = results[2];

                  res.json({
                    success:true,
                    modules:modules,
                    instances:instances,
                    datasources: externalDatasources
                  });
                }
              );

              break;

            case "uploadModule":
              var fh = new FileHandler({db:config.mongodb.filedb});

              info.module = JSON.parse(info.module);
              var moduleKey = info.module.key;
              var moduleName = info.module.name;
              var moduleDescription = info.module.description;
              var moduleConfig = Object.removeDollarKeys(info.module.config || {}) || {};
              var moduleCode = info.module.code || "";
              var clientCode = info.module.clientCode || "";
              var timeout = info.module.timeout;

              var createOrModify = function(newFileName) {
                var data = {$set: {updated: new Date()}};

                if (moduleKey) data["$set"].key = moduleKey;
                if (moduleName) data["$set"].name = moduleName;
                if (moduleDescription) data["$set"].description = moduleDescription;
                if (moduleConfig) data["$set"].config = moduleConfig;
                if (moduleCode) data["$set"].code = moduleCode;
                if (newFileName) data["$set"].template = newFileName;
                if (timeout) data["$set"].timeout = timeout;

                data["$set"].clientCode = clientCode;

                async.series([
                  function(callback) {
                    config.mongodb.db.collection("wiki_modules").find({ key:moduleKey },{ template:1 }).toArray(function(e,page) {
                      callback(e,page);
                    });
                  },
                  function(callback) {
                    config.mongodb.db.collection("wiki_modules").findAndModify({ key:moduleKey },[],data,{ upsert:true, new:true },function(e,doc) {
                      callback(e,doc);
                    });
                  }
                ],
                  function(err,results) {
                    if (err) {
                      res.json({success:false, error:err});
                      return log.error(err);
                    }

                    var oldModule = results[0];
                    var updatedModule = results[1].value || results[1];

                    res.json({success:true, module:updatedModule});

                    if (oldModule.length && oldModule[0].template && newFileName) {
                      fh.deleteFile({filename:oldModule[0].template},function(e) {
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

            case "deleteModule":
              var fh = new FileHandler({db:config.mongodb.filedb});
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
}
