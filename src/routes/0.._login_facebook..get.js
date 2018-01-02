import passport from "passport"
import bunyan from "bunyan"
import config from "../config.js"

const log = bunyan.createLogger(config.logger.options())

var additionalScopes = [];
if (config.oauth_scopes instanceof Array) {
  additionalScopes = config.oauth_scopes.filter(function(s) { return s.type == 'facebook' }).map(function(s) { return s.scope });
  log.debug('Additional oauth_scopes found for facebook login: ' + additionalScopes.join(','));
}

module.exports = passport.authenticate("facebook",{scope: [].concat(['email'],additionalScopes)});
