var passport = require("passport");
var config = require("../config.js");

var additionalScopes = [];
if (config.oauth_scopes instanceof Array) {
  additionalScopes = config.oauth_scopes.filter(function(s) { return s.type == 'facebook' }).map(function(s) { return s.scope });
}

module.exports = passport.authenticate("facebook",{scope: [].concat(['email'],additionalScopes)});
