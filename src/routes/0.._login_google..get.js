import passport from "passport"
import bunyan from "bunyan"
import config from "../config.js"

const log = bunyan.createLogger(config.logger.options())

var additionalScopes = [];
if (config.oauth_scopes instanceof Array) {
  additionalScopes = config.oauth_scopes.filter(function(s) { return s.type == 'google' }).map(function(s) { return s.scope });
  log.debug('Additional oauth_scopes found for google login: ' + additionalScopes.join(','));
}

module.exports = passport.authenticate("google",{
  scope: [].concat(["profile", "email"],additionalScopes),
  accessType: 'offline'   //returns the refresh token
});
