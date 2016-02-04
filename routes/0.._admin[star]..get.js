(function(req,res) {
  var wiki = new WikiHandler({path:"/admin"+req.params[0]});
  
  var o = {};
  o.loggedIn = (req.session.loggedIn) ? true : false;
  o.pagePieces = wiki.pageTree();
  
  if (!req.session.loggedIn) {
    res.redirect("/");
  } else {
    var username = req.session.sAMAccountName.toLowerCase();
    config.mongodb.db.collection("adminsettings").find({domid:"wikiadmins","value.username":{$in:[username]}}).toArray(function(_e,admin) {
      if (admin.length) {
        //get the admin settings to include
        
        res.send("You can access this page!");
      } else res.redirect("/user/" + username);
    });
  }
})