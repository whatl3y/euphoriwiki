(function(req,res) {
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
        
        res.render("admin_template_mgmt",config.view.send(req,{obj:o}));
      } else res.redirect("/");
    });
  }
})