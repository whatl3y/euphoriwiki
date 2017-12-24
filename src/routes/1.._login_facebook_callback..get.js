var passport = require("passport");

module.exports = passport.authenticate("facebook", {successRedirect:'/', failureRedirect:'/login/facebook'});
