import "babel-polyfill"

// import newrelic from "newrelic"
import mongodb from 'mongodb'
import os from "os"
import fs from "fs"
import bunyan from "bunyan"
import express from "express"
import cluster from "cluster"
import sticky from "sticky-session"
import session from "express-session"
import formidable from 'express-formidable'
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import connectMongo from "connect-mongo"
import redis from "redis"
import path from "path"
import http from "http"
import socketIo from "socket.io"
import passport from "passport"
import uuid from 'node-uuid'
import _ from "underscore"
import async from "async"
import jade from "jade"
import html from "html"
import mammoth from "mammoth"
import Encryption from "./libs/Encryption.js"
import SocketHandler from "./libs/SocketHandler.js"
import Auth from "./libs/Authentication.js"
import GetHTML from "./libs/GetHTML.js"
import Audit from "./libs/Audit.js"
import AccessManagement from "./libs/AccessManagement.js"
import ChildProcesses from "./libs/ChildProcesses.js"
import RouteHandler from "./libs/RouteHandler.js"
import WikiHandler from "./libs/WikiHandler.js"
import FileHandler from "./libs/FileHandler.js"
import SQLHandler from "./libs/SQLHandler.js"
import DirectoryProcessor from "./libs/DirectoryProcessor.js"
import Object from "./src/public/js/extras/Object_prototypes.js"

// TODO: Need to figure out how to use import for config. Reason we
// currently need require is because of the `eval()` below for
// initialization queries
//
// import config from "./config.js"
const config = require("./config.js")

const log         = bunyan.createLogger(config.logger.options())
const app         = express()
const httpServer  = http.Server(app)
const mongoStore  = connectMongo(session)
const io          = socketIo(httpServer, { pingInterval: 4000, pingTimeout: 10000 })

try {
  //handle clustering if applicable
  if (config.server.CLUSTERING) {
    if (!sticky.listen(httpServer, config.server.PORT)) {    //if (cluster.isMaster) {}
      httpServer.once("listening",function() {log.info("listening on *:"+config.server.PORT)})

      // Count CPUs, max CLUSTER_MAX_CPUS forks
      var cpuCount = os.cpus().length;
      log.debug("Number of CPUs on machine: " + cpuCount)
      cpuCount = (cpuCount > config.server.CLUSTER_MAX_CPUS) ? config.server.CLUSTER_MAX_CPUS : cpuCount;
      log.debug("Number of CPUs we're using: " + cpuCount)

      // Create a worker for each CPU
      for (var _i=0;_i<cpuCount;_i++) {
        cluster.fork()
      }

      // Listen for dying workers
      cluster.on("exit", function (worker) {
        // Replace the dead worker
        log.info("Worker " + worker.id + " died. Creating another worker...")
        cluster.fork()
      })
    } else {
      main()
    }
  } else {
    main(true)
  }

} catch (_err) {
  log.error(_err)
}


//FUNCTIONS
function main(notClustering) {
  async.waterfall([
    function(callback) {
      config.mongodb.initialize(function(err,options) {
        log.debug("Finished setting up MongoDB database instances.");
        callback(err,options);
      });
    },
    function(options,callback) {
      //go get all the routes available for express to serve and bind
      //them to listeners, then get all the links we'll need for the header
      //header navigation bar, then initialize web server
      var db = options.db;
      new RouteHandler().update(db,function(err) {
        log.debug("Finished setting up routes.");
        callback(err);
      });
    },
    function(callback) {
      new WikiHandler().initQueries(function(err,data) {
        log.debug("Finished initialization tasks in WikiHandler().initQueries().");
        callback(err,data);
      });
    }
  ],
    function(err, results) {
      if (err)
        return log.error(err)

      //var options = results[0];
      var queries = results.queries
      var oData = results.oData

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

      io.use((socket, next) => sessionMiddleware(socket.request, socket.request.res, next))

      //static files
      app.use("/public", express.static(path.join(__dirname, "/public")))

      // HEROKU DEPLOYMENT ONLY HTTPS REDIRECT
      // In production redirect to https endpoint
      // http://stackoverflow.com/questions/29810607/how-to-force-https-redirect-on-heroku-with-express-4-0
      app.use(function(req, res, next) {
        if (process.env.NODE_ENV === 'production') {
          if (config.server.HOST.indexOf('https://') === 0 && req.headers['x-forwarded-proto'] != 'https') {
            return res.redirect('https://' + req.headers.host + req.url)
          }
        }
        return next()
      })

      //if any of the queries stored in the DB have extra code we need to eval(), do that here
      queries.forEach(queryInfo => {
        if (queryInfo.extracode) {
          try {
            eval(queryInfo.extracode)
            log.debug(`Successfully ran extra code for initializequeries - collection: ${queryInfo.collection} info: ${JSON.stringify(queryInfo)}`)
          } catch(err) {
            log.error(err, `Error running extra code for initializequeries - collection: ${queryInfo.collection} info: ${JSON.stringify(queryInfo)}`)
          }
        }
      })

      // initialize routes object to be used to bind express routes
      var aRoutes = fs.readdirSync("routes");
      var oRoutes = {};
      for (var _i=0; _i < aRoutes.length; _i++) {
        oRoutes[aRoutes[_i]] = require("./routes/" + aRoutes[_i]);
      }

      //setup route handlers in the express app
      _.each(oData.routes,function(route) {
        try {
          app[route.verb.toLowerCase()](route.path,oRoutes[route.file]);
        } catch(err) {
          log.error(err,"Error binding route to express; method: " + route.verb + "; path: " + route.path);
        }
      });

      //passport setup
      _.each(fs.readdirSync("./passport_strategies") || [],function(stratFile) {
        try {
          const oStrat = require("./passport_strategies/" + stratFile)
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
        httpServer.listen(config.server.PORT, () => log.info(`listening on *: ${config.server.PORT}`))
      }

      //handle if the process suddenly stops
      //process.on("exit",config.mongodb.MDB.close);
      //process.on("SIGINT",config.mongodb.MDB.close);
      //process.on("SIGTERM",config.mongodb.MDB.close);
    }
  );
}
