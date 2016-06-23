var fs = require("fs");
var async = require("async");
var config = require("./config.js");
var log = require("bunyan").createLogger(config.logger.options());

/*-----------------------------------------------------------------------------------------
|TITLE:    RouteHandler.js
|PURPOSE:  Handles creating routes in the database where they're stored.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      update: updates the routes
|ASSUMES:
|REVISION HISTORY:
|      *LJW 1/25/2016 - created
-----------------------------------------------------------------------------------------*/
RouteHandler=function(options) {
  options = options || {};

  this.path = options.path || "routes";
  this.collection = options.collection || "routes";
}

/*-----------------------------------------------------------------------------------------
|NAME:      update (PUBLIC)
|DESCRIPTION:
|PARAMETERS:  1. db(REQ): the database object from mongodb to run queries against a MongoDB database
|             2. cb(OPT): callback function to execute after routes have been updates
|SIDE EFFECTS:  None
|CALLED FROM:
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
RouteHandler.prototype.update=function(db,cb) {
  var self=this;

  async.waterfall([
    function(callback) {
      fs.readdir(self.path,function(err,files) {
        return callback(err,files);
      });
    },
    function(files,callback) {
      async.each(files,function(file,_callback) {
        log.debug("Staging route file: " + file);

        var routeInfo = file.replace(/\.js/g,"").replace(/_/g,"/").replace(/\[star\]/g,"*").replace(/\[colon\]/g,":").split("..");
        var routeOrder = Number(routeInfo[0] || 0);
        var routePath = routeInfo[1];
        var routeVerb = routeInfo[2] || "get";

        db.collection(self.collection).update({path:routePath,verb:routeVerb},{
          "$set": {
            file: file,
            verb: routeVerb,
            path: routePath,
            order: routeOrder,
            active: true
          }
        },{upsert:true},function(_e,result) {
          log.debug("Finished staging route: VERB > " + routeVerb + " - PATH > " + routePath);

          return _callback(_e)
        });
      },
      function(err) {
        log.debug("Finished staging all routes.");

        return callback(err);
      });
    }
  ],
    function(err) {
      if (typeof cb === "function") return cb(err);
    }
  );
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=RouteHandler;
}
//-------------------------------------------------------
