var newrelic = require("newrelic");
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
var mongoStore = require("connect-mongo")(session);
var path = require("path");
var http = require("http").Server(app);
var io = require("socket.io")(http,{pingInterval:4000, pingTimeout:10000});
var passport = require("passport");
var uuid = require('node-uuid');
var _ = require("underscore");
var async = require("async");
var jade = require("jade");
var html = require("html");
var mammoth = require("mammoth");
var Encryption = require("./libs/Encryption.js");
var SocketHandler = require("./libs/SocketHandler.js");
var Auth = require("./libs/Authentication.js");
var GetHTML = require("./libs/GetHTML.js");
var Audit = require("./libs/Audit.js");
var AccessManagement = require("./libs/AccessManagement.js");
var ChildProcesses = require("./libs/ChildProcesses.js");
var RouteHandler = require("./libs/RouteHandler.js");
var WikiHandler = require("./libs/WikiHandler.js");
var FileHandler = require("./libs/FileHandler.js");
var SQLHandler = require("./libs/SQLHandler.js");
var DirectoryProcessor = require("./libs/DirectoryProcessor.js");
var config = require("./libs/config.js");
var log = require("bunyan").createLogger(config.logger.options());
var Object = require("./public/js/Object_prototypes.js");

try {
  var aRoutes = fs.readdirSync("routes");
  var oRoutes = {};
  for (var _i=0; _i < aRoutes.length; _i++) {
    oRoutes[aRoutes[_i]] = require("./routes/" + aRoutes[_i]);
  }

  if (config.server.CLUSTERING) {
    if (!sticky.listen(http,config.server.PORT)) {    //if (cluster.isMaster) {}
      http.once("listening",function() {log.info("listening on *:"+config.server.PORT);});

      // Count CPUs, max CLUSTER_MAX_CPUS forks
      var cpuCount = os.cpus().length;
      cpuCount = (cpuCount > config.server.CLUSTER_MAX_CPUS) ? config.server.CLUSTER_MAX_CPUS : cpuCount;

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
  async.waterfall([
    function(callback) {
      config.mongodb.initialize(function(err,options) {
        callback(err,options);
      });
    },
    function(options,callback) {
      //go get all the routes available for express to serve and bind
      //them to listeners, then get all the links we'll need for the header
      //header navigation bar, then initialize web server
      var db = options.db;
      new RouteHandler().update(db,function(err) {
        callback(err);
      });
    },
    function(callback) {
      new WikiHandler().initQueries(function(err,data) {
        callback(err,data);
      });
    }
  ],
    function(err,results) {
      if (err) return log.error(err);

      //var options = results[0];
      var queries = results.queries;
      var oData = results.oData;

      //view engine setup
      app.set("views", path.join(__dirname, "views"));
      app.set("view engine", "jade");

      app.use(bodyParser.urlencoded({extended:true, limit:"10mb"}));
      app.use(bodyParser.json({limit:"1mb"}));
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
      app.use(passport.initialize());
      app.use(passport.session());

      io.use(function(socket, next) {
        sessionMiddleware(socket.request,socket.request.res,next);
      });

      //static files
      app.use("/public",express.static(path.join(__dirname,"/public")));

      //if any of the queries stored in the DB have extra code we need to eval(), do that here
      _.each(queries,function(queryInfo) {
        if (queryInfo.extracode) {
          try {
            eval(queryInfo.extracode);
          } catch(err) {
            log.error(err);
          }
        }
      });

      //setup route handlers in the express app
      _.each(oData.routes,function(route) {
        try {
          app[route.verb.toLowerCase()](route.path,/*eval(route.callback)*/oRoutes[route.file]);
        } catch(err) {
          log.error(err,"Error binding route to express; method: " + route.verb + "; path: " + route.path);
        }
      });

      //passport setup
      _.each(fs.readdirSync("./passport_strategies") || [],function(stratFile) {
        try {
          var oStrat = require("./passport_strategies/" + stratFile);
          if ((typeof oStrat.condition === "undefined") || oStrat.condition) {
            var stratName = path.basename(stratFile,".js");

            if (oStrat.options) return passport.use(stratName,new oStrat.strategy(oStrat.options,oStrat.handler));
            return passport.use(stratName,new oStrat.strategy(oStrat.handler));
          }

        } catch(err) {
          log.error(err);
        }
      });

      passport.serializeUser(function(user, done) {done(null, user);});
      passport.deserializeUser(function(user, done) {done(null, user);});

      //initialize socket.io and socket handlers
      new SocketHandler({io:io});

      //starts the web server listening on specified port
      //if we're not clustered
      if (notClustering) {
        http.listen(config.server.PORT, function(){
          log.info("listening on *:"+config.server.PORT);
        });
      }

      //handle if the process suddenly stops
      //process.on("exit",config.mongodb.MDB.close);
      //process.on("SIGINT",config.mongodb.MDB.close);
      //process.on("SIGTERM",config.mongodb.MDB.close);
    }
  );
}
