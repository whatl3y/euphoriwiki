var LocalStrategy = require("passport-local").Strategy;
var Authentication = require("../libs/Authentication.js");

var A = new Authentication();

module.exports = {
  strategy: LocalStrategy,
  handler: function(username,password,done) {
    if (username && username == A.GLOBAL_ADMIN) return done(null,((password == A.GLOBAL_PASSWORD) ? username : false));
    
    A.findOrSaveUser({upsert:false, username:username},function(e,userRecord) {
      if (e) return done(e);
      if (!userRecord) return done(null,false);
      
      if (userRecord.password) {
        if (A.validatePassword(password,userRecord.password)) return done(null,username);
        return done(null,false);
      }
      
      return done(null,false);
    });
  }
}