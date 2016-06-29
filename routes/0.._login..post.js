var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var async = require("async");
var passport = require("passport");
var Auth = require("../libs/Authentication.js");
var Audit = require("../libs/Audit.js");
var WikiHandler = require("../libs/WikiHandler.js");
var config = require("../config.js");
var log = require("bunyan").createLogger(config.logger.options());

var oStrats = {};
var strats = fs.readdirSync(path.join(".","passport_strategies")) || [];
for (var _i = 0; _i < strats.length; _i++) {
  oStrats[strats[_i]] = require("../passport_strategies/" + strats[_i]);
}

module.exports = function(req,res) {
  var info = req.body;
  var A = new Auth({session:req.session});
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});

  //built strategy authentications for non built-in passport strategies
  var strategyWaterfallFunctions = [];
  _.each(strats.sort(),function(stratFile) {
    try {
      var oStrat = oStrats[stratFile];

      if (oStrat.BUILTIN) return;
      if ((typeof oStrat.condition === "undefined") || oStrat.condition) {
        var stratName = path.basename(stratFile,".js");

        return strategyWaterfallFunctions.push(function(un,callback) {
          if (un) return callback(null,un);

          passport.authenticate(stratName, function(err,user,passportInfo) {
            if (err) return callback(err);
            return callback(null,user);

          })(req, res);
        });
      }

    } catch(err) {
      log.error(err);
    }
  });

  switch(info.type) {
    case "loginLocal":
      async.waterfall([].concat([
        function(callback) {
          return callback(null,false);
        }
      ],
      strategyWaterfallFunctions,
      [
        function(user,callback) {
          if (!user) return callback("We were unable to authenticate you. Please make sure your username and password are correct and try again or contact your admin if the problem persists.");

          A.findOrSaveUser({username:user},function(err,userRecord) {
            callback(err,user,userRecord || false);
          });
        },
        function(user,userRecord,callback) {
          if (!userRecord && user != A.GLOBAL_ADMIN) {
            var loginUsername = user + ((user.indexOf("@") > -1) ? "" : "@" + config.ldap.suffix);
            A.find({attribute:"userPrincipalName", value:loginUsername},function(err,info) {
              callback(err,user,info,false);
            });
          } else callback(null,user,userRecord,true);
        }
      ]),
        function(err,user,userRecord,existsAlready) {
          if (err) {
            if (err instanceof Error) log.error(err);
            return res.json({success:false, error:(err instanceof Error) ? "There was an issue trying to log you in. Please try again or contact your wiki admin if the problem persists." : err});
          }

          var userExists = existsAlready;
          var userInfo = (typeof userRecord=="object" && userRecord.username)
            ? userRecord
            : ((typeof userRecord==="object" && userRecord.users instanceof Array && userRecord.users.length)
              ? userRecord.users[0]
              : {});

          var saveData;
          if (userExists) {
            saveData = {
              $set: {
                lastlogin: new Date(),
                username: user.toLowerCase(),
                firstname: userInfo.firstname || userInfo.givenName,
                lastname: userInfo.lastname || userInfo.familyName || userInfo.sn,
                sAMAccountName: userInfo.sAMAccountName || null,
                distinguishedName: userInfo.dn || null,
                email: userInfo.email || userInfo.mail || null
              }
            }
          } else {
            saveData = {
              type: "activedirectory",
              created: new Date(),
              lastlogin: new Date(),
              username: user.toLowerCase(),
              firstname: userInfo.firstname || userInfo.givenName,
              lastname: userInfo.lastname || userInfo.familyName || userInfo.sn,
              sAMAccountName: userInfo.sAMAccountName || null,
              distinguishedName: userInfo.dn || null,
              email: userInfo.email || userInfo.mail || null
            };
          }


          A.findOrSaveUser(Object.merge(saveData,{upsert:true}),function(e,doc) {
            if (e) {
              res.json({success:false, error:e});
              return log.error(e);
            }

            A.login(saveData.$set || saveData,function(_e) {
              if (e) {
                log.error(e);
                return res.json({success:false, error:"There was an issue trying to log you in. Please try again."});
              }

              res.json({success:true});
            });

            new WikiHandler().event({type:"login", params:{username:user}},function(e,result) {if (e) log.error(e);});
            audit.log({type:"Login", user:user});
          });
        }
      );

      break;

    case "authTypes":
      var authTypes = _.mapObject(config.authtypes,function(val,key) {return (val == "true") ? true : false;});
      res.json({success:true, types:authTypes});

      break;

    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
}
