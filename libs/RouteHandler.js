var fs = require("fs");
var async = require("async");
var Encryption = require("./Encryption.js");
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
  this.encryption = options.encryption || new Encryption();
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
      // db.collection(self.collection).remove({},null,function(err) {
      //   return callback(err,db);
      // });
      db.collection(self.collection).find({},{_id:0,verb:1,path:1,content_hash:1}).toArray(function(e,routes) {
        return callback(null,routes);
      });
    },
    function(aRoutes,callback) {
      fs.readdir(self.path,function(err,files) {
        return callback(err,files,aRoutes);
      });
    },
    function(files,aRoutes,callback) {
      async.each(files,function(file,_callback) {
        log.debug("Staging route file: " + file);

        async.waterfall([
          function(__callback) {
            fs.readFile(self.path+"/"+file,{encoding:"utf8"},function(_err,content) {
              return __callback(_err,content);
            });
          },
          function(content,__callback) {
            try {
              return __callback(null,content,self.encryption.stringToHash(content));
            } catch(e) {
              return __callback(e);
            }
          },
          function(content,contentHash,__callback) {
            var routeInfo = file.replace(/\.js/g,"").replace(/_/g,"/").replace(/\[star\]/g,"*").replace(/\[colon\]/g,":").split("..");
            var routeOrder = Number(routeInfo[0] || 0);
            var routePath = routeInfo[1];
            var routeVerb = routeInfo[2] || "get";
            var routeHash = contentHash;

            var existingRoute = aRoutes.filter(function(r) {return r.path === routePath && r.verb === routeVerb})[0];

            if (routeVerb+routeHash === existingRoute.verb+existingRoute.content_hash) {
              __callback();
              return log.debug("No changes to route: VERB > " + routeVerb + " - PATH > " + routePath);
            }

            db.collection(self.collection).update({path:routePath,verb:routeVerb},{
              "$set": {
                verb: routeVerb,
                path: routePath,
                callback: content,
                content_hash: routeHash,
                order: routeOrder,
                active: true
              }
            },{upsert:true},function(_e,result) {
              log.debug("Finished staging route: VERB > " + routeVerb + " - PATH > " + routePath);
              content = null;

              return __callback(_e)
            });
          }
        ],
          function(err) {
            return _callback(err);
          }
        );
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
