var fs = require("fs");
var async = require("async");
var MDB = require("./MDB.js");
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
|PARAMETERS:  1. cb(OPT): callback function to execute after routes have been updates
|SIDE EFFECTS:  None
|CALLED FROM:
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
RouteHandler.prototype.update=function(cb) {
  var self=this;

  async.waterfall([
    function(callback) {
      new MDB({config:config, callback:function(err,opts) {
        callback(err,opts.db);
      }});
    },
    function(db,callback) {
      db.collection(self.collection).remove({},null,function(err) {
        callback(err,db);
      });
    },
    function(db,callback) {
      fs.readdir(self.path,function(err,files) {
        callback(err,db,files);
      });
    },
    function(db,files,callback) {
      async.each(files,function(file,_callback) {
        log.debug("Staging route file: " + file);

        async.waterfall([
          function(__callback) {
            fs.readFile(self.path+"/"+file,{encoding:"utf8"},function(_err,content) {
              __callback(_err,content);
            });
          },
          function(content,__callback) {
            var routeInfo = file.replace(/\.js/g,"").replace(/_/g,"/").replace(/\[star\]/g,"*").replace(/\[colon\]/g,":").split("..");
            var routeOrder = Number(routeInfo[0] || 0);
            var routePath = routeInfo[1];
            var routeVerb = routeInfo[2] || "get";

            db.collection(self.collection).update({path:routePath,verb:routeVerb},{
              "$set": {
                verb: routeVerb,
                path: routePath,
                callback: content,
                order: routeOrder,
                active: true
              }
            },{upsert:true},function(_e,result) {
              __callback(_e)
            });
          }
        ],
          function(err) {
            _callback(err);
          }
        );
      },
      function(err) {
        log.debug("Finished staging all routes.");

        callback(err);
      });
    }
  ],
    function(err) {
      if (typeof cb==="function") cb(err);
    }
  );
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=RouteHandler;
}
//-------------------------------------------------------
