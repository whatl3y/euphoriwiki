import mysql from "mysql"
import mssql from "mssql"
import pg from "pg"

/*-----------------------------------------------------------------------------------------
|TITLE:      SQLHandler.js
|PURPOSE:    Allows a wrapper for running SQL queries for different databases.
|AUTHOR:    Lance Whatley
|CALLABLE TAGS:
|ASSUMES:    mysql, mssql
|REVISION HISTORY:
|        *LJW 3/1/2016 - created
-----------------------------------------------------------------------------------------*/
var SQLHandler = function(opts) {
  opts = opts || {};

  this.config = opts.config || {};
  this.driver = opts.driver || "mssql";

  try {
    if (this.driver) {
      this.connection = this.init().createConnection[this.map.driver[this.driver]](this.config);
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

    //TODO change all createConnection types to not just take the raw config
    //object as it's input, but do some validation and ensure we're passing
    //the correct key/value pairs or a complete connection string (pg)
    createConnection: {
      mysql: function(config) {
        return mysql.createConnection(config);
      },
      mssql: function(config) {
        return new mssql.Connection(config);
      },
      postgresql: function(config) {
        return new pg.Client(config);
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
      mysql: function(q,ary,cb) {
        cb = (typeof ary === 'function') ? ary : cb;
        ary = (typeof ary === 'function') ? null : ary;

        if (self.connection) {
          if (ary instanceof Array) {
            return self.connection.query(q,ary,cb);
          }
          return self.connection.query(q,cb)
        }
        return self.noop(q,cb);
      },
      mssql: function(q,cb) {
        var conn = (self.connection) ? self.connection : {};
        new mssql.Request(conn).query(q,cb);
      },
      postgresql: function(q,ary,cb) {
        // (self.connection) ? self.connection.query(q,cb) : self.noop(q,cb);
        cb = (typeof ary === 'function') ? ary : cb;
        ary = (typeof ary === 'function') ? null : ary;

        if (self.connection) {
          if (ary instanceof Array) {
            return self.connection.query(q,ary,cb);
          }
          return self.connection.query(q,cb)
        }
        return self.noop(q,cb);
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
  this.map.connect[this.map.driver[this.driver]](cb);
  return this;
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
SQLHandler.prototype.query = function(options,dataArray,cb) {
  options = options || {};

  cb = (typeof dataArray === "function") ? dataArray : cb;

  if (typeof dataArray === "function") {
    if (typeof options === "string") {
      dataArray = null;
    } else {
      dataArray = options.dataArray || options.data;
    }
  }

  var q = (typeof options==="string") ? options : (options.query || options.q);

  var self = this;
  var responseFunction = function(__e,data) {
    if (typeof options==="object" && options.close) self.close();
    return cb(__e,data);
  };

  if (dataArray) {
    self.map.query[self.map.driver[self.driver]](q,dataArray,responseFunction);
  } else {
    self.map.query[self.map.driver[self.driver]](q,responseFunction);
  }
  return this;
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
  } else {
    cb(null,options.object);
  }
  return this;
}

/*-----------------------------------------------------------------------------------------
|NAME:      close (PUBLIC)
|DESCRIPTION: close the current connection
|PARAMETERS:
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
SQLHandler.prototype.close=function() {
  this.map.close[this.map.driver[this.driver]]();
  return this;
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
  return this;
}

module.exports = SQLHandler
export { SQLHandler as default }
