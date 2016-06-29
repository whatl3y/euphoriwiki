var LocalStrategy = require("passport-local").Strategy;
var Authentication = require("../libs/Authentication.js");
var config = require("../config.js");

module.exports = {
  strategy: LocalStrategy,
  handler: function(username,password,done) {
    config.mongodb.db.collection("adminsettings").find({domid:"authtypes"}).toArray(function(e,types) {
      if (e) return done(e);
      if (!types || !types.length) return done(null,false);
      
      var ldapEnabled = (typeof types[0].value.ldap !== "undefined" && (types[0].value.ldap === true || types[0].value.ldap === "true"));
      
      if (ldapEnabled && config.ldap.url) {      //determines if LDAP is enabled in application
        new Authentication().auth({type:"activedirectory", username:username, password:password},function(err,authenticated) {
          if (err) return done(err);
          else if (authenticated) return done(null,username);
          else return done(null,false);
        });
      } else return done(null,false);
    });
  }
}