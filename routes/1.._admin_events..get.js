var Auth = require("../libs/Authentication.js");
var AccessManagement = require("../libs/AccessManagement.js");
var config = require("../config.js");

module.exports = function(req,res) {
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db:config.mongodb.db});

  var o = {};
  o.loggedIn = A.isLoggedIn();

  if (!A.isLoggedIn()) {
    res.redirect("/");
  } else {
    var username = A.username;
    Access.isWikiAdmin(username,function(e,isAdmin) {
      if (isAdmin) {
        //get the admin settings to include

        res.render("admin_events",config.view.send(req,{obj:o}));
      } else res.redirect("/");
    });
  }
}
