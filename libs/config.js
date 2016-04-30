var path = require("path");
var MDB = require('./MDB.js');
var Object = require("../public/js/Object_prototypes.js");

var self = module.exports = {
  server: {
    PORT: process.env.PORT || 8000,
    CLUSTERING: process.env.CLUSTERING || false,
    IS_PRODUCTION: process.env.IS_PRODUCTION || false,
    HOST: process.env.HOSTNAME || "http://pmglap1126"
  },
  
  admin: {
    SETTINGS: []
  },
  
  view: {
    NAVLINKS: [],              //placeholder where all links will be stored once we retrieve them from our persistent store
    CLIENTSOCKETEVENTS : [],   //placeholder where all client socket event listeners will be stored and sent to the client on a request
    send: function(req,opts) {
      opts = opts || {};
      var obj = opts.obj || {};
      
      var routeInfo = opts.routeInfo || {};
      
      var protocol = (req.secure) ? "https": "http";
      var host= "";
      var wshost=  "";
      
      return {
        data: {
          external: {
            wshost:  wshost,
            port: self.server.PORT,
            socketEvents: this.CLIENTSOCKETEVENTS,
            EXTRA: obj
          },
          host: host,
          session: req.session,
          title: opts.title || null,
          nav: this.NAVLINKS,
          settings: self.admin.SETTINGS
        }
      };
    }
  },
  
  socketio: {
    DEFAULTNAMESPACE: '/',
    DEFAULTROOM: '/',
    NUM_MESSAGES: process.env.NUM_MESSAGES || 25,
    CACHE: {}
  },
  
  session: {
    sessionSecret: process.env.SESSION_SECRET,
    sessionCookieKey: process.env.SESSION_COOKIE_KEY,
    storeOptions: function() {
      return {
        url: self.mongodb.connectionString(),
        ttl: 7 * 24 * 60 * 60          //expiration, 7 days
      };
    }
  },
  
  mongodb: {
    access: {
      FULL_URI:  process.env.MONGODB_FULLURI || null,
      PROTOCOL:  'mongodb',
      HOST:    process.env.MONGODB_HOST || "localhost",
      PORT:    Number(process.env.MONGODB_PORT || 27017),
      USER:    process.env.MONGODB_USER,
      PASSWORD:  process.env.MONGODB_PW,
      TESTDB:    process.env.MONGODB_DB_DEV,
      PRODDB:     process.env.MONGODB_DB
    },
    
    MDB:    {},                //will be the instance of MDB we use to open a connection with the mongodb server
    db:      {},                //the object we'll be using to create cursors and return/set data in mongoDB
    
    dbInfo:  function() {
      var db= (self.server.IS_PRODUCTION) ? this.access.PRODDB : this.access.TESTDB;
      
      return {
        full:  this.access.FULL_URI,
        p:    this.access.PROTOCOL,
        h:    this.access.HOST,
        user:  this.access.USER,
        pw:    this.access.PASSWORD,
        port:  this.access.PORT,
        db:    db
      }
    },
    
    connectionString: function() {
      var dbInfo=this.dbInfo() || {};
      
      var protocol=dbInfo.p;
      var host=dbInfo.h;
      var user=dbInfo.user;
      var password=dbInfo.pw;
      var port=dbInfo.port;
      var db=dbInfo.db;
      
      var auth = (user && password) ? user+":"+password+"@" : "";
      
      return dbInfo.full || protocol+'://'+auth+host+':'+port+'/'+db;
    },
          
    initialize:  function(cb) {
      var oSelf=this;
      new MDB({config:self, callback:function(err,opts) {
          oSelf.db=opts.db;
          oSelf.MDB=opts.self;
          
          if (typeof cb==='function') cb(err,opts);
        }
      });
    },
    
    REFERENCE: {                //shouldn't probably be using these values, just for reference
      DEVFILES: 'data/wiki/dev',        //relative to the mongodb folder
      PRODFILES: 'data/wiki/prod'
    }
  },
  
  smtp: {
    core: {
      pool: process.env.SMTP_POOL,
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      
      defaultEmail: process.env.SMTP_DEFAULTEMAIL,
      defaultName: process.env.SMTP_DEFAULTNAME
    },
    
    nodemailerconfig: function() {
      if (this.core.host) {
        var o = {
          //pool: this.core.pool,
          host: this.core.host,
          port: Number(this.core.port || 587),
          secure: this.core.secure || false,
          authMethod: this.core.authMethod || "PLAIN"
        };
        
        if (typeof this.core.auth==="object" && this.core.auth.user) {
          o.auth = {
            user: this.core.auth.user,
            pass: this.core.auth.pass
          };
        }
        
        return o;
      } else {
        return null;
      }
    }
  },
  
  authtypes: {
    local: "true",
    facebook: "false"
  },
  
  ldap: {
    protocol: process.env.LDAP_PROTOCOL,
    url: process.env.LDAP_URL,
    basedn: process.env.LDAP_BASEDN,
    username: process.env.LDAP_USERNAME,
    password: process.env.LDAP_PASSWORD,
    suffix: process.env.LDAP_SUFFIX
  },
  
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    loginCallbackUrl: function() {
      return self.server.HOST + "/login/facebook/callback";
    }
  },
  
  cryptography: {
    algorithm: "aes-256-ctr",
    password: process.env.CRYPT_SECRET
  },
  
  logger: {
    options: function(app) {
      return {
        name: app || "euphoriwiki",
        /*level: process.env.LOGGING_LEVEL || "info",
        stream: process.stdout*/
        streams: [
          {
            level: process.env.LOGGING_LEVEL || "info",
            path: path.join(__dirname,"..","logs","wiki.log")
          }
        ]
      }
    }
  }
};