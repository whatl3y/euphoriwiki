(function(req,res) {
  if (!req.session.loggedIn) {
    res.redirect("/");
  } else {
    var username = req.session.sAMAccountName.toLowerCase();
    res.redirect("/user/" + username);
  }
})