import minimist from 'minimist'
import async from 'async'
import FileHandler from "../libs/FileHandler.js"
import config from "../config.js"

const argv = minimist(process.argv.slice(2))

//node bin/upload_file -p path_to_my_file
//node bin/upload_file -p path_to_my_file1 -p path_to_my_file2
var fileNames = argv.p || argv.path || null;
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
        fh.uploadFile({path:f},function(e,newFileName) {
          _callback(e,newFileName);
        });
      }
    });
    async.parallel(parallelFunctions,function(err,newFileNames) {
      callback(err,newFileNames);
    });
  }
],
  function(err,file_names) {
    config.mongodb.MDB.close();
    config.mongodb.fileMDB.close();
    console.log(err,file_names);
  }
);
