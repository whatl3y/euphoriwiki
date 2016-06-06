var FacebookStrategy = require('passport-facebook').Strategy;
var async = require("async");
var Authentication = require("../libs/Authentication.js");
var WikiHandler = require("../libs/WikiHandler.js");
var Audit = require("../libs/Audit.js");
var config = require("../libs/config.js");
var log = require("bunyan").createLogger(config.logger.options());
var Object = require("../public/js/Object_prototypes.js");

var A = new Authentication();

module.exports = {
  BUILTIN: true,
  strategy: FacebookStrategy,
  condition: config.facebook.appId,
  options: {
    clientID: config.facebook.appId,
    clientSecret: config.facebook.appSecret,
    callbackURL: config.facebook.loginCallbackUrl(),
    enableProof: true,
    passReqToCallback: true,
    profileFields: ["id", "emails", "name"]
  },
  handler: function(req, accessToken, refreshToken, profile, done) {
    A.session = req.session;
    
    if (typeof profile === "object") {
      var info = {
        username: "fb_" + profile.id,
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
            type: "facebook",
            created: new Date(),
            lastlogin: new Date(),
            username: info.username,
            firstname: info.firstname,
            lastname: info.lastname,
            email: info.email || null,
            accessToken: info.accessToken,
            refreshToken: info.refreshToken
          };
          
          A.findOrSaveUser(Object.merge(saveData,{upsert:true}),function(e,doc) {
            if (e) {
              callback(e);
            } else {
              A.login(doc,function(_e) {
                callback(_e,doc);
              });
            }
            
            new WikiHandler().event({type:"login", params:{username:info.username}},function(e,result) {if (e) log.error(e);});
            new Audit().log({type:"Login", user:info.username});
          });
        } else callback(null,userRecord);
      }
    ],
      function(err,userRecord) {
        return done(err,info.username);
      }
    );
  }
}