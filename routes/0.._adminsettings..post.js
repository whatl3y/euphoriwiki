(function(req,res) {
	var info = req.body;
	
	switch(info.type) {
		case "init":
			config.mongodb.db.collection("adminsettings").find({active:{$not:{$eq:false}}}).sort({order:1,name:1}).toArray(function(_e,settings) {
				if (_e) {
					log.error(_e);
					res.json({success:false});
				} else {
					for (var _i=0; _i<settings.length; _i++) {
						var h = jade.renderFile(__dirname+'/views/adminsettings/'+settings[_i].include);
						settings[_i].html = h;
					}
					
					res.json({success:true, settings:settings});
				}
			});
			
			break;
		
		case "save":
			var settingKey = info.key;
			var value = info.value;
			value = Object.removeDollarKeys(value);
			
			config.mongodb.db.collection("adminsettings").update({domid:settingKey},{$set:{value:value}},function(err) {
				if (err) res.json({success:false, error:err});
				else res.json({success:true});
				
				//reset config cache
				config.mongodb.db.collection("adminsettings").find().toArray(function(e,settings) {
					if (e) log.error(e);
					else config.admin.SETTINGS = settings;
				});
			});
			
			break;
		
		default:
			res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
	}
})