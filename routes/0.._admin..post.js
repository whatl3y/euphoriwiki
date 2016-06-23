var fs = require("fs");
var _ = require("underscore");
var async = require("async");
var GetHTML = require("../libs/GetHTML.js");
var Authentication = require("../libs/Authentication.js");
var WikiHandler = require("../libs/WikiHandler.js");
var config = require("../libs/config.js");
var log = require("bunyan").createLogger(config.logger.options());

module.exports = function(req,res) {
  var info = req.body;

  var gH = new GetHTML();

  switch(info.type) {
    case "init":
      config.mongodb.db.collection("adminsettings").find({active:{$not:{$eq:false}}}).sort({name:1}).toArray(function(_e,settings) {
        if (_e) {
          res.json({success:false});
          return log.error(_e);
        }

        var settingHtml = {};
        async.each(settings,function(setting,callback) {
          fs.readFile(__dirname+'/../views/adminsettings/'+setting.include,{encoding:"utf8"},function(_e,contents) {
            if (_e) return callback(_e);

            try {
              var method = gH.extension(setting.include).substring(1);
              gH[method](contents,function(__e,h) {
                settingHtml[setting.domid] = h || "";
                return callback(__e);
              });

            } catch(err) {
              settingHtml[setting.domid] = "";
              return callback(err);
            }
          });
        },function(err) {
          if (err) log.error(err);

          settings = settings.map(function(setting) {
            return Object.merge(setting,{html:settingHtml[setting.domid] || ""});
          })

          return res.json({success:true, settings:settings});
        });
      });

      break;

    case "save":
      var settingKey = info.key;
      var value = info.value;
      value = Object.removeDollarKeys(value);

      var A = new Authentication();

      var saveSetting = function(value) {
        async.series([
          function(callback) {
            config.mongodb.db.collection("adminsettings").update({domid:settingKey},{$set:{value:value}},function(err) {
              if (err) res.json({success:false, error:"There was an issue saving your setting. Please check the logs or try again."});
              else res.json({success:true});

              callback(err);
            });
          },
          function(callback) {
            config.mongodb.db.collection("adminsettings").find().toArray(function(e,settings) {
              callback(e,settings);
            });
          },
          function(callback) {
            new WikiHandler().initQueries(function(err,data) {
              callback(err,data);
            });
          }
        ],
          function(err,results) {
            if (err) return log.error(err);

            var settings = results[1];
            var queries = results[2].queries;
            var oData = results[2].oData;

            //reset config cache and execute initial queries
            //that will reset information in config file
            config.admin.SETTINGS = settings;
            _.each(queries,function(queryInfo) {
              if (queryInfo.extracode) {
                try {
                  eval(queryInfo.extracode);
                } catch(err) {
                  log.error(err);
                }
              }
            });
          }
        );
      }


      if (settingKey != "datasources" && (value instanceof Array && typeof value[0] === "object" && value[0].username)) {
        var newValue = [];

        async.each(value,function(v,callback) {
          A.findOrSaveUser({username:v.username},function(e,userInfo) {
            if (e) return callback(e);

            if (userInfo) {
              newValue.push({
                username: userInfo.username,
                firstname: userInfo.firstname,
                lastname: userInfo.lastname
              })
            } else newValue.push({username:v.username});

            return callback();
          });
        },
          function(err) {
            if (err) return log.error(err);

            saveSetting(newValue);
          }
        );
      } else saveSetting(value);


      break;

    case "visitors":
      res.json({success:true, visitors:config.socketio.CACHE.sockets});

      break;

    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
}
