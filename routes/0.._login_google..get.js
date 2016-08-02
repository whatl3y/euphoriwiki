var passport = require("passport");
var config = require("../config.js");

var additionalScopes = [];
if (config.oauth_scopes instanceof Array) {
  additionalScopes = config.oauth_scopes.filter(function(s) { return s.type == 'google' }).map(function(s) { return s.scope });
}

module.exports = passport.authenticate("google",{scope: [].concat(["profile", "email"],additionalScopes)});
