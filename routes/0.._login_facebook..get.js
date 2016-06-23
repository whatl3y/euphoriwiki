var passport = require("passport");

module.exports = passport.authenticate("facebook",{scope: ['email']});
