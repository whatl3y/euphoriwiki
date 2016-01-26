(function(req,res) {
	var info = req.body;
	
	switch(info.type) {
		case "getWidgets":
			config.mongodb.db.collection("homewidgets").find({active:true}).toArray(function(_e,widgets) {
				if (widgets.length) {
					var aWidgets = _.map(widgets,function(widget) {
						var sortObject = {};
						if (widget.orderField) sortObject[widget.orderField] = widget.orderDirection;
						
						return {
							collection: widget.collection,
							key: widget.name,
							filters: widget.filter || {},
							sort: sortObject,
							limit: widget.limit || null,
							fields: widget.fields || {}
						};
					});
					
					config.mongodb.MDB.findRecursive({
						db: config.mongodb.db,
						array: aWidgets
					},function(err,oData) {
						if (err) res.json({success:false, error:err});
						else {
							var returnedWidgets = [];
							var keys = _.keys(oData);
							
							_.each(keys,function(k) {
								var o = {};
								o.items = oData[k];
								o.name = k;
								
								returnedWidgets.push(o);
							});
							
							res.json({success:true, widgets:returnedWidgets});
						}
					});
				} else res.json({success:false});
			});
			
			
			break;
			
		case "somethingelse":
			
			
			break;
			
		default:
			res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
	}
})