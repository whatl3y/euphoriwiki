import mongodb from "mongodb"
import config from "../config.js"

const MongoClient = mongodb.MongoClient

/*-----------------------------------------------------------------------------------------
|TITLE:    MDB.js
|PURPOSE:  Will be a helper object to connect to a MongoDB database. Utilizes the npm mongodb module.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      go: opens a DB connection, this can happen in the constructor or at a later point
|      close: closes the DB connection we established with this object
|ASSUMES:  mongodb native driver in nodejs
|REVISION HISTORY:
|      *LJW 2/10/2015 - created
-----------------------------------------------------------------------------------------*/
var MDB = function(params,cb) {
  if (typeof params === 'string') {
    this.connectionString = params;
    this.MongoClient = MongoClient;
    this.go(cb);
  } else {
    params = params || {};
    var config = params.config || config;
    this.MongoClient = params.MongoClient || MongoClient;                    //the instance of the MongoClient i.e. MongoClient = require('mongodb').MongoClient
    this.connectionString = params.connectionString || params.url || config.mongodb.connectionString();    //the URL to the instance of the DB -- NOTE: params.url overrides the other parameters above
    cb = params.callback || cb;

    if (!params.dontopen) {                                  //params.dontopen: if set to true will not automatically open a DB connection
      this.go(cb);                                           //params.callback: a callback function to be executed in constructor at the time of connecting to DB
    }
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      go (PUBLIC)
|DESCRIPTION:  Establish DB connection with info from constructor and tries to run a
|        callback function.
|PARAMETERS:  1. cb(OPT): either a callback function we might want to call at the time we
|              successfully connect to the DB or an array of callback functions
|              that will be called sequentially.
|SIDE EFFECTS:  None
|CALLED FROM:
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
MDB.prototype.go=function(cb) {
  var self=this;

  var main = function(err,db) {
    self.db = db;

    if (typeof cb==='function') {
      cb(err,{db:db, self:self});
    } else if (typeof cb==='object') {
      for (var _i in cb) {
        cb[_i](err,{db:db, self:self});
      }
    }
  }

  //make the initial connection
  this.MongoClient.connect(this.connectionString,function(err,db) {
    if (err!=null) main(err);
    else main(null,db);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      queryRecursive (PUBLIC)
|DESCRIPTION:  Runs MongoDB queries provided in options.
|        NOTE: if the collection has an "order" field, we will sort on that field.
|PARAMETERS:  1. options(REQ): options for queries
|              options.db: optional db object we're using for the query
|              options.index: index for which query we're running in options.array
|              options.object: object where the returned information is getting stored
|              options.array: array of queries we're running
|                options.array[<i>].collection: collection where we're getting records from
|                options.array[<i>].key: key where we're storing in options.object
|                options.array[<i>].filters: optional options to include in the find() query
|                options.array[<i>].sort: optional sort options
|                options.array[<i>].limit: optional limit to limit amount of documents returned
|                options.array[<i>].fields: the specific fields you want to return
|        2. cb(REQ): callback
|              cb(err,obj)
|SIDE EFFECTS:
|CALLED FROM:
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
MDB.prototype.findRecursive=function(options,cb) {
  var self=this;

  options.array = options.array || [];
  options.index = options.index || 0;
  options.object = options.object || {};

  if (options.array.length > options.index) {
    var coll = (options.db || config.mongodb.db).collection(options.array[options.index].collection);
    var filter = options.array[options.index].filters || {};
    var sort = options.array[options.index].sort || {order:1};
    var limit = options.array[options.index].limit || 999999;
    var fields = options.array[options.index].fields || {};

    coll.find(filter,fields).sort(sort).limit(limit).toArray(function(err,docs) {
      if (err) cb(err,options.object);
      else {
        options.object[options.array[options.index].key] = docs;
        options.index++;

        self.findRecursive(options,cb);
      }
    });
  } else {
    cb(null,options.object);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      close (PUBLIC)
|DESCRIPTION:  Closes the DB connection we established in the constructor.
|PARAMETERS:  1. db(REQ): the db returned from the MongoClient instance after connecting
|SIDE EFFECTS:  Closes the DB that is referenced in the parameter
|CALLED FROM:
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
MDB.prototype.close=function(db) {
  if (db!=null) db.close();
  else this.db.close();
}

module.exports=MDB
export { MDB as default }
