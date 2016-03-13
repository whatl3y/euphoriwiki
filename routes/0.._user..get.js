(function(req,res) {
  if (!req.session.loggedIn) {
    res.redirect("/");
  } else {
    var username = req.session.username;
    res.redirect("/user/" + username);
  }
})