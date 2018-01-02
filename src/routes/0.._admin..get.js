import Auth from "../libs/Authentication.js"
import AccessManagement from "../libs/AccessManagement.js"
import config from "../config.js"

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

        res.render("admin",config.view.send(req,{obj:o,title:"Admin Settings"}));
      } else res.redirect("/user/" + username);
    });
  }
}
