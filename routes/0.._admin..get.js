(function(req,res) {
	if (!req.session.loggedIn) {
		res.redirect("/");
	} else {
		res.redirect("/user/"+req.session.sAMAccountName);
		
		//res.render("adminmain",config.view.send(req));
	}
})