import passport from "passport"

module.exports = passport.authenticate("google", {successRedirect:'/', failureRedirect:'/login/google'});
