var passport = require("passport");

module.exports = passport.authenticate("google",{scope: ["profile", "email"]});
