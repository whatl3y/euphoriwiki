(function(req,res) {
  var o = {};
  o.loggedIn = (req.session.loggedIn) ? true : false;
  
  if (!req.session.loggedIn) {
    res.redirect("/");
  } else {
    var username = req.session.sAMAccountName.toLowerCase();
    config.mongodb.db.collection("adminsettings").find({domid:"wikiadmins","value.username":{$in:[username]}}).toArray(function(_e,admin) {
      if (admin.length) {
        //get the admin settings to include
        
        res.render("admin",config.view.send(req,{obj:o,title:"Admin Settings"}));
      } else res.redirect("/user/" + username);
    });
  }
})