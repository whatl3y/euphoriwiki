var argv = require('minimist')(process.argv.slice(2));
var async = require('async');
var BatchJobs = require("../libs/BatchJobs.js");
var config = require("../config.js");
var Object = require("../public/js/extras/Object_prototypes.js");

//node bin/exec_jobs -j my_job
//node bin/exec_jobs -j my_job -j my_job2
var jobNames = argv.j || argv.job || null;

async.waterfall([
  function(callback) {
    config.mongodb.initialize(function(err,options) {
      return callback(err)
    });
  },
  function(callback) {
    var mainDb = config.mongodb.db;
    var fileDb = config.mongodb.filedb;
    var jobs_filter = {active:{$ne:false}};

    var bj = new BatchJobs({db:mainDb, filedb:fileDb});
    bj.find(jobNames,function(e,jobs) {
      return callback(e,bj,jobs);
    })
  },
  function(batchJobs,aJobs,callback) {
    var filteredJobs = batchJobs.filterJobsToExecute(aJobs);
    batchJobs.execute(filteredJobs,function(e,results) {
      callback(e,results);
    });
  }
],
  function(err,executionResults) {
    config.mongodb.MDB.close();
    config.mongodb.fileMDB.close();
    console.log(err,executionResults);
  }
);
