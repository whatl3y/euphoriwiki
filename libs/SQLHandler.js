var mysql = require("mysql");
var mssql = require("mssql");
var pg = require("pg");

/*-----------------------------------------------------------------------------------------
|TITLE:      SQLHandler.js
|PURPOSE:    Allows a wrapper for running SQL queries for different databases.
|AUTHOR:    Lance Whatley
|CALLABLE TAGS:
|ASSUMES:    mysql, mssql
|REVISION HISTORY:  
|        *LJW 3/1/2016 - created
-----------------------------------------------------------------------------------------*/
SQLHandler = function(opts) {
  opts = opts || {};
  
  this.config = opts.config || {};
  this.driver = opts.driver || "mssql";
  
  try {
    if (this.driver) {
      this.connection = this.init().createConnection[this.driver](this.config);
      this.init();
    }
  } catch(err) {
    console.log(err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      connect (PUBLIC)
|DESCRIPTION:  
|PARAMETERS:  1. cb(REQ): the function we would like to call with results from messages
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
SQLHandler.prototype.init = function() {
  var self = this;
  
  return this.map = {
    driver: {
      mysql: "mysql",
      mssql: "mssql",
      postgres: "postgresql",
      postgresql: "postgresql"
    },
    
    createConnection: {
      mysql: function(config) {
        return mysql.createConnection(config);
      },
      mssql: function(config) {
        return new mssql.Connection(config);
      },
      postgresql: function(conString) {
        return new pg.Client(conString);
      }
    },
    
    connect: {
      mysql: function(cb)  {
        (self.connection) ? self.connection.connect(cb) : self.noop(cb);
      },
      mssql: function(cb)  {
        (self.connection) ? self.connection.connect(cb) : self.noop(cb);
      },
      postgresql: function(cb) {
        (self.connection) ? self.connection.connect(cb) : self.noop(cb);
      }
    },
    
    query: {
      mysql: function(q,cb) {
        (self.connection) ? self.connection.query(q,cb) : self.noop(q,cb);
      },
      mssql: function(q,cb) {
        var conn = (self.connection) ? self.connection : {};
        new mssql.Request(conn).query(q,cb);
      },
      postgresql: function(q,cb) {
        (self.connection) ? self.connection.query(q,cb) : self.noop(q,cb);
      }
    },
    
    close: {
      mysql: function() {
        (self.connection) ? self.connection.destroy() : self.noop();
      },
      mssql: function() {
        (self.connection) ? self.connection.close() : self.noop();
      },
      postgresql: function() {
        (self.connection) ? self.connection.end() : self.noop();
      }
    }
  };
}

/*-----------------------------------------------------------------------------------------
|NAME:      connect (PUBLIC)
|DESCRIPTION:  
|PARAMETERS:  1. cb(REQ): the function we would like to call with results from messages
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
SQLHandler.prototype.connect = function(cb) {
  this.map.connect[this.driver](cb);
}

/*-----------------------------------------------------------------------------------------
|NAME:      query (PUBLIC)
|DESCRIPTION:  Get all data from a query stored in the DB
|PARAMETERS:  1. options(REQ): options for the query
|              options.query: the query to run
|              options.close: true/false whether to close the connection
|        2. cb(REQ): the function we would like to call with results from messages
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
SQLHandler.prototype.query = function(options,cb) {
  options = options || {};
  var q = (typeof options==="string") ? options : options.query;
  
  var self = this;
  
  self.map.query[self.driver](q,function(__e,data) {
    if (typeof options==="object" && options.close) self.map.close[self.driver]();
    cb(__e,data);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      queriesRecursive (PUBLIC)
|DESCRIPTION:  Runs multiple queries and returns all the results back in a single object to the callback function.
|PARAMETERS:  1. options(REQ): options for the query
|              options.array: array of objects that contains the key that the data will be
|                  returned in options.object and the query we'll be
|                    options.array[i].Query: query to run
|                    options.array[i].ObjectKey: key in the object where data will go
|              options.index: the current 0 start index of the query we're running
|              options.object: object that we'll be returning the data from the multiple
|                  queries will be returned in.
|        2. cb(REQ): the function we would like to call with results from the queries
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
SQLHandler.prototype.queriesRecursive = function(options,cb) {
  options.index = options.index || 0;
  options.object = options.object || {};
  
  var self=this;
  
  if (options.array[options.index]) {
    self.query({query:options.array[options.index].Query},function(_e,data) {
      if (_e) cb(_e,options.object);
      else {
        options.object[options.array[options.index].ObjectKey] = data;
        options.index++;
        
        self.queriesRecursive(options,cb);
      }
    })
  } else cb(null,options.object);
}

/*-----------------------------------------------------------------------------------------
|NAME:      noop (PUBLIC)
|DESCRIPTION: noop function
|PARAMETERS:  1. cb(OPT): optional callback
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <function>: a blank function
-----------------------------------------------------------------------------------------*/
SQLHandler.prototype.noop=function(cb1,cb2) {
  if (typeof cb1==="function") cb1();
  else if (typeof cb2==="function") cb2();
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=SQLHandler;
}
//-------------------------------------------------------