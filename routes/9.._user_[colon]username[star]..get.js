(function(req,res) {
	var A = new Auth();
	
	var username = req.params.username.toLowerCase();
	
	A.find({attribute:"sAMAccountName", value:username},function(_e,info) {
		if (_e || !info) res.render("userpage",config.view.send(req,{obj:{
			pageHeader: "We could not find a user with username: "+username,
			firstname: "Unknown",
			lastname: "Unknown"
		}}));
		else {
			var userInfo = info.users[0];
			var o;
			
			if (req.session.loggedIn && req.session.sAMAccountName==userInfo.sAMAccountName) {
				o = {
					pageHeader: "Your page!",
					loggedInUsersPage: true,
					firstname: userInfo.givenName,
					lastname: userInfo.sn
				};
			} else {
				o = {
					pageHeader: userInfo.givenName + "'s page!",
					loggedInUsersPage: false,
					firstname: userInfo.givenName,
					lastname: userInfo.sn
				};
			}
			
			res.render("userpage",config.view.send(req,{obj:o}));
		}
	});
})