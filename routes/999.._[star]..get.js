(function(req,res) {
	var o = {};
	if (req.session.loggedIn) {
		o = {loggedIn: true};
	} else {
		o = {loggedIn: false}
	}
	
	res.render("wikipage",config.view.send(req,{obj:o}));
})