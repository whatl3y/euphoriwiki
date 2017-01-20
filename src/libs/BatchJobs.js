var async = require('async');
var CodeRunner = require("./CodeRunner.js");
var FileHandler = require("./FileHandler.js");
var config = require("../config.js");
var Object = require("../src/public/js/extras/Object_prototypes.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    BatchJobs.js
|PURPOSE:  Handles getting, creating, and running new batch jobs.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  MongoDB
|REVISION HISTORY:
|      *LJW 7/29/2016 - created
-----------------------------------------------------------------------------------------*/
var BatchJobs = function(opts) {
  opts=opts || {};
  this.db = opts.db || config.mongodb.db;
  this.filedb = opts.filedb || this.db;
}

/*-----------------------------------------------------------------------------------------
|NAME:      find (PUBLIC)
|DESCRIPTION:  Finds jobs matching criteria
|PARAMETERS:  1. jobName(OPT): get batch jobs with this name. DEFAULT: blank, get all active jobs
|CALLED FROM:
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
BatchJobs.prototype.find = function(jobName,cb) {
  cb = (typeof jobName === "function") ? jobName : cb;

  // Handle if jobName is passed as string (single job),
  // array (multiple jobs), or not passed a tall
  var filter = {};
  if (typeof jobName === "string") {
    filter = {job_name:jobName};
  } else if (jobName instanceof Array) {
    filter = {$or:[]}
    for (var _i=0; _i<jobName.length; _i++) {
      filter['$or'].push({job_name:jobName[_i]});
    }
  }

  filter = Object.merge(filter,{active:{$ne:false}});
  this.db.collection('batch_jobs').find(filter).toArray(function(e,jobs) {
    cb(e,jobs);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      filterJobsToExecute (PUBLIC)
|DESCRIPTION:  Takes an array of jobs and filters them based on if they should be executed.
|PARAMETERS:  1. jobsArray(OPT):
|CALLED FROM:
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <array>: filtered array of jobs to be executed
-----------------------------------------------------------------------------------------*/
BatchJobs.prototype.filterJobsToExecute = function(jobsArray) {
  return jobsArray.filter(function(j) {
    if (typeof j.active !== "undefined" && !j.active) return false;
    if (j.last_execution_time instanceof Date && ((Date.now()-j.last_execution_time.getTime())/1000/60) <= j.frequency_minutes) return false;
    if (typeof j.number_of_occurrences === "number" && typeof j.occurrences_ran === "number" && j.occurrences_ran >= j.number_of_occurrences) return false;
    return true;
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      execute (PUBLIC)
|DESCRIPTION:  Takes an array of jobs and executes their code.
|PARAMETERS:  1. jobsArray(OPT): array of jobs to execute
|             2. cb(REQ): callback function to run once all jobs have been executed
|CALLED FROM:
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
BatchJobs.prototype.execute = function(jobsArray,cb) {
  var self = this;
  var fh = new FileHandler({db:this.filedb});
  var executionTime = new Date();

  var parallelFunctions = jobsArray.map(function(j) {
    return function(callback) {
      async.waterfall([
        function(_callback) {
          fh.getFile({file:j.file, encoding:'utf8'},function(e,jobCode) {
            _callback(e,jobCode);
          });
        },
        function(jobCode,_callback) {
          var codeResult = new CodeRunner(jobCode).eval();
          _callback(null,codeResult);
        },
        function(result,_callback) {
          self.db.collection('batch_jobs').update({job_name:j.job_name},{
            $inc: {occurrences_ran: 1},
            $set: {last_execution_time: executionTime},
            $push: {
              execution_data: {
                time: executionTime,
                result: result
              }
            }
          },function(_e,updateResult) {
            _callback(_e,result);
          });
        }
      ],
        function(e,executionResult) {
          return callback(e,executionResult);
        }
      );
    }
  });

  async.parallel(parallelFunctions,function(err,results) {
    return cb(err,results);
  });
}

module.exports = BatchJobs
