import passport from "passport"

module.exports = passport.authenticate("facebook", {successRedirect:'/', failureRedirect:'/login/facebook'});
