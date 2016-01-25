(function(req,res) {
	var info = req.body;
	
	info.page = ((info.page[info.page.length-1]=="/") ? info.page.substring(0,info.page.length-1) : info.page).toLowerCase();
	
	switch(info.type) {
		case "init":
			config.mongodb.db.collection("wikicontent").find({path:info.page}).toArray(function(_e,info) {
				if (_e) res.json({success:false, error:_e});
				else {
					if (!info.length) res.json({success:true, exists:false, html:"", markup:""});
					else res.json({
						success: true,
						exists: true,
						html: info[0].content_html,
						markup: info[0].content_markup,
						lastUpdate: info[0].updated,
						person: info[0].updatedBy,
						versions: info[0].history
					});
				}
			});
			
			break;
			
		case "update":
			if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to update wiki pages."});
			else {
				var saveData = {
					"$set": {
						path: info.page,
						content_html: info.html,
						content_markdown: info.markdown,
						updated: new Date(),
						updatedBy: {
							firstname: req.session.givenName,
							lastname: req.session.sn,
							username: req.session.sAMAccountName
						}
					}
				};
				
				config.mongodb.db.collection("wikicontent").find({path:info.page}).toArray(function(_e,current) {
					if (current.length) saveData["$push"] = {history: current[0]};
					
					config.mongodb.db.collection("wikicontent").update({ path:info.page },saveData,{ upsert:true },
						function(err,doc) {
							if (err) res.json({success:false, error:"There was an error saving your information. Please try again.", debug:err});
							else res.json({success:true});
						}
					);
				});
			}
			break;
			
		default:
			res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
	}
})