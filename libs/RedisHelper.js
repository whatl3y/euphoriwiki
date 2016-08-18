var async = require('async');
var redis = require('redis');

/*-----------------------------------------------------------------------------------------
|TITLE:    RedisHelper.js
|PURPOSE:  Helper methods to get/set redis objects in a redis instance.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|
|ASSUMES:  mongodb native driver in nodejs
|REVISION HISTORY:
|      *LJW 8/4/2016 - created
-----------------------------------------------------------------------------------------*/
var RedisHelper = function(urlOrClient) {
  try {
    if (typeof urlOrClient === 'string') {
      this.client = redis.createClient({url:urlOrClient});
    } else {
      this.client = urlOrClient;
    }
  } catch(e) {
    this.client = null;
  }

  //http://redis.io/commands/INFO
  //memory information about redis instance
  this.info = function(param,cb) {
    this.client.info(param,cb);
  };

  this.dbsize = function(cb) {
    this.client.dbsize(cb);
  };

  this.key_size = function(cb) {
    this.dbsize(cb);
  };

  this.number_of_keys = function(cb) {
    this.dbsize(cb);
  };

  this.type = function(key,cb) {
    this.client.type(key,cb);
  };

  this.scan = function(cursor,cb) {
    this.client.scan(cursor,function(err,cursorAndKeys) {
      return cb(err,cursorAndKeys);
    });
  };

  // Gets the keys that match a pattern
  // http://redis.io/commands/KEYS
  // wildcard is *
  this.keys = function(pattern,cb) {
    this.client.keys(pattern,cb);
  };

  this.debug_object = function(key,cb) {
    this.client.debug('object',key,cb);
  };

  this.string = function(key,cb) {
    this.client.get(key,cb);
  };

  this.list = function(key,cb) {
    this.client.lrange(key, 0, -1, function(_err,listValues) {
      cb(_err,listValues)
    });
  };

  this.hash = function(key,cb) {
    var self = this;
    var cursor= 0;
    var object = {};
    async.doUntil(function(callback) {
      self.client.hscan(key,cursor,function(err,cursorAndKeys) {
        if (err) return callback(err);

        cursor = cursorAndKeys[0];
        object[cursorAndKeys[1][0]] = cursorAndKeys[1][1];
        return callback(null,cursor);
      });
    },
      // test function
      function(scanCursor) {
        return 0 === Number(scanCursor);
      },
      // after getting all keys this is the final callback
      function(err) {
        cb(err,object);
      }
    );
  };

  this.set = function(key,cb) {
    this.client.smembers(key,function(_err,values) {
      return cb(_err,values);
    });
  };

  this.zset = function(key,cb) {
    this.client.zrange(key,0,-1,'WITHSCORES',function(_err,values) {
      if (_err) return cb(_err);

      var oSetValues = {};
      for (var _i=0;_i<values.length;_i=_i+2) {
        oSetValues[values[_i+1]] = values[_i]
      }
      return cb(null,oSetValues);
    })
  };

  this.end = function() {
    this.client.end(false);
  };

  this.close = function() {
    this.end();
  }
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=RedisHelper;
}
//-------------------------------------------------------
