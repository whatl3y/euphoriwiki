(function(req,res) {
	var tree = function(route) {
		var pages=[];
		
		//pages.push({text:'home',link:"/"});
		var splitPages=route.split('/');
		var tempLink="";
		
		for (var _i=0;_i<splitPages.length;_i++) {
			tempLink+="/"+splitPages[_i];
			pages.push({
				text: splitPages[_i],
				link: tempLink
			});
		}
		
		return pages;
	}
	
	var o = {};
	o.loggedIn = (req.session.loggedIn) ? true : false;
	o.pagePieces = tree(req.params[0]);
	var path = (req.params[0].indexOf("favicon.ico") == 0) ? null : "/"+req.params[0];
	
	res.render("wikipage",config.view.send(req,{obj:o,title:path}));
	
	// NOTE: need to move this to class at some point
	// increment the page visits for the page
	if (path) {
		path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();
		config.mongodb.db.collection("wikicontent").update({path:path},{"$inc":{pageViews:1}},function(_e) {
			if (_e) log.error(_e);
			else log.trace("Page, " + path + ", has been visited.");
		});
	}
})