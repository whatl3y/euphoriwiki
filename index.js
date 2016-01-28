var os = require("os");
var fs = require("fs");
var express = require("express");
var app = express();
var cluster = require("cluster");
var sticky = require("sticky-session");
var session = require("express-session");
var formidable = require('express-formidable');
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var mongo = require("mongodb");
var mongoStore = require("connect-mongo")(session);
var Grid = require('gridfs-stream');
var path = require("path");
var http = require("http").Server(app);
var io = require("socket.io")(http);
var _ = require("underscore");
var jade = require('jade');
var mammoth = require("mammoth");
var IOHandler = require("./libs/IOHandler.js");
var Auth = require("./libs/Authentication");
var RouteHandler = require("./libs/RouteHandler.js");
var WikiHandler = require("./libs/WikiHandler.js");
var config = require("./libs/config.js");
var log = require("bunyan").createLogger(config.logger.options());
var Object = require("./public/js/Object_prototypes.js");

try {
  if (config.server.CLUSTERING) {
    if (!sticky.listen(http,config.server.PORT)) {    //if (cluster.isMaster) {}
      http.once("listening",function() {log.info("listening on *:"+config.server.PORT);});
      
      // Count CPUs
      var cpuCount = os.cpus().length;
      
      // Create a worker for each CPU
      for (var _i=0;_i<cpuCount;_i++) {
        cluster.fork();
      }
      
      // Listen for dying workers
      cluster.on("exit", function (worker) {
        // Replace the dead worker
        log.info("Worker " + worker.id + " died. Creating another worker...");
        cluster.fork();
      });
    } else {
      main();
    }
  } else {
    main(true);
  }
  
} catch (_err) {
  log.error(_err);
}


//FUNCTIONS
function main(notClustering) {
  config.mongodb.initialize(function(err,options) {
    if (err) {
      log.error("Error connecting to mongodb: "+err);
      return;
    }
      
    //view engine setup
    app.set("views", path.join(__dirname, "views"));
    app.set("view engine", "jade");
    
    app.use(bodyParser.urlencoded({extended:true, limit:"50mb"}));
    app.use(bodyParser.json({limit:"50mb"}));
    app.use(formidable.parse());
    app.use(cookieParser(config.session.sessionSecret));
    
    var sessionMiddleware=session({
      store: new mongoStore(config.session.storeOptions()),
      secret: config.session.sessionSecret,
      key: config.session.sessionCookieKey,
      resave: true,
      saveUninitialized: true
      //cookie: { secure: true }
    });
    
    app.use(sessionMiddleware);
    
    io.use(function(socket, next) {
      sessionMiddleware(socket.request,socket.request.res,next);
    });
    
    //static files
    app.use("/public",express.static(path.join(__dirname,"/public")));
    
    //go get all the routes available for express to serve and bind
    //them to listeners, then get all the links we'll need for the header
    //header navigation bar, then initialize web server
    new RouteHandler().update(function() {
      config.mongodb.db.collection("initializequeries").find().toArray(function(err,queries) {
        log.debug(queries);
        
        config.mongodb.MDB.findRecursive({
          db: config.mongodb.db,
          array: queries
        },function(err,oData) {
          log.debug(err,oData);
          
          //if any of the queries stored in the DB have extra code we need to eval(), do that here
          _.each(queries,function(queryInfo) {
            if (queryInfo.extracode) eval(queryInfo.extracode);
          });
          
          //setup route handlers in the express app
          _.each(oData.routes,function(route) {
            app[route.verb.toLowerCase()](route.path,eval(route.callback));
          });
          
          //starts the web server listening on specified port
          //if we're not using clustering
          if (notClustering) {
            http.listen(config.server.PORT, function(){
              log.info("listening on *:"+config.server.PORT);
            });
          }
        });
      });
    });
    
    //handle if the process suddenly stops
    //process.on("exit",config.mongodb.MDB.close);
    //process.on("SIGINT",config.mongodb.MDB.close);
    //process.on("SIGTERM",config.mongodb.MDB.close);
  });
}