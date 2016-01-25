var fs = require("fs");
var _ = require("underscore");
var MDB = require("./MDB.js");
var config = require("./config.js");
var log = require("bunyan").createLogger(config.logger.options());

/*-----------------------------------------------------------------------------------------
|TITLE:		RouteHandler.js
|PURPOSE:	Handles creating routes in the database where they're stored.
|AUTHOR:	Lance Whatley
|CALLABLE TAGS:
|			update: updates the routes 
|ASSUMES:	
|REVISION HISTORY:	
|			*LJW 1/25/2016 - created
-----------------------------------------------------------------------------------------*/
RouteHandler=function(options) {
	this.path = "routes";
	this.collection = "routes";
}

/*-----------------------------------------------------------------------------------------
|NAME:			update (PUBLIC)
|DESCRIPTION:	
|PARAMETERS:	1. cb(OPT): callback function to execute after routes have been updates
|SIDE EFFECTS:	None
|CALLED FROM:	
|ASSUMES:		Nothing
|RETURNS:		Nothing
-----------------------------------------------------------------------------------------*/
RouteHandler.prototype.update=function(cb) {
	var self=this;
	
	fs.readdir(this.path,function(err,files) {
		_.each(files,function(file) {
			fs.readFile(self.path+"/"+file,{encoding:"utf8"},function(_err,content) {
				if (_err) log.error(_err);
				else {
					new MDB({config:config, callback:function(err,opts) {
							var db=opts.db;
							var MDB=opts.self;
							
							var routeInfo = file.replace(/\.js/g,"").replace(/_/g,"/").replace(/\[star\]/g,"*").replace(/\[colon\]/g,":").split("..");
							var routeOrder = routeInfo[0] || 0;
							var routePath = routeInfo[1];
							var routeVerb = routeInfo[2] || "get";
							
							db.collection(self.collection).update({path:routePath},{
								"$set": {
									verb: routeVerb,
									path: routePath,
									callback: content,
									order: routeOrder,
									active: true
								}
							},{upsert:true},function(_e,result) {
								log.debug(_e,result);
								//db.close();
							});
						}
					});
				}
			});
		});
		
		if (typeof cb==="function") setTimeout(function(){cb();},1000);
	});
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
	module.exports=RouteHandler;
}
//-------------------------------------------------------