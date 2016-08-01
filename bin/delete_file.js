var argv = require('minimist')(process.argv.slice(2));
var async = require('async');
var FileHandler = require("../libs/FileHandler.js");
var config = require("../config.js");

//node bin/upload_file -p path_to_my_file
//node bin/upload_file -p path_to_my_file1 -p path_to_my_file2
var fileNames = argv.p || argv.path || argv.file || argv.f || null;
fileNames = (typeof fileNames === "string") ? [fileNames] : fileNames;

async.waterfall([
  function(callback) {
    config.mongodb.initialize(function(err,options) {
      return callback(err)
    });
  },
  function(callback) {
    var fileDb = config.mongodb.filedb;
    fh = new FileHandler({db:fileDb});

    var parallelFunctions = fileNames.map(function(f) {
      return function(_callback) {
        fh.deleteFile({filename:f},function(e) {
          _callback(e);
        });
      }
    });
    async.parallel(parallelFunctions,function(err) {
      callback(err);
    });
  }
],
  function(err) {
    config.mongodb.MDB.close();
    config.mongodb.fileMDB.close();
    console.log(err);
  }
);