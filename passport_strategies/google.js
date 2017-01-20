var GoogleStrategy = require('passport-google-oauth20').Strategy;
var async = require("async");
var Authentication = require("../libs/Authentication.js");
var WikiHandler = require("../libs/WikiHandler.js");
var Audit = require("../libs/Audit.js");
var config = require("../config.js");
var log = require("bunyan").createLogger(config.logger.options());
var Object = require("../public/js/extras/Object_prototypes.js");

var A = new Authentication();

module.exports = {
  BUILTIN: true,
  strategy: GoogleStrategy,
  options: {
    clientID: config.google.appId,
    clientSecret: config.google.appSecret,
    callbackURL: config.google.loginCallbackUrl(),
    passReqToCallback: true
  },
  handler: function(req, accessToken, refreshToken, profile, done) {
    log.debug('access',accessToken,'refresh',refreshToken,'profile',profile);

    A.session = req.session;

    if (typeof profile === "object") {
      var info = {
        username: "google_" + profile.id,
        firstname: profile.name.givenName,
        lastname: profile.name.familyName,
        email: profile.emails[0].value,
        accessToken: accessToken,
        refreshToken: refreshToken
      };
    } else return done(null,false);

    async.waterfall([
      function(callback) {
        A.findOrSaveUser({username:info.username},function(err,user) {
          callback(err,user);
        });
      },
      function(user,callback) {
        if (user) {
          A.login(user,function(_e) {
            callback(_e,user);
          });
        } else callback(null,false);
      },
      function(userRecord,callback) {
        if (!userRecord) {
          var saveData = {
            type: "google",
            created: new Date(),
            lastlogin: new Date(),
            username: info.username,
            firstname: info.firstname,
            lastname: info.lastname,
            email: info.email || null
          };

          if (info.accessToken) saveData.accessToken = info.accessToken;
          if (info.refreshToken) saveData.refreshToken = info.refreshToken;
        } else {
          var saveData = {
            $set: {
              lastlogin: new Date(),
              username: info.username,
              firstname: info.firstname,
              lastname: info.lastname,
              email: info.email || null
            }
          }

          if (info.accessToken) saveData['$set'].accessToken = info.accessToken;
          if (info.refreshToken) saveData['$set'].refreshToken = info.refreshToken;
        }

        A.findOrSaveUser(Object.merge(saveData,{upsert:true}),function(e,doc) {
          if (e) return callback(e);

          A.login(doc,function(_e) {
            callback(_e,doc);
          });

          new WikiHandler().event({type:"login", params:{username:info.username}},function(e,result) {if (e) log.error(e);});
          new Audit().log({type:"Login", user:info.username});
        });
      }
    ],
      function(err,userRecord) {
        return done(err,info.username);
      }
    );
  }
}
