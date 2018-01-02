import child_process from 'child_process'

const fork = child_process.fork

/*-----------------------------------------------------------------------------------------
|TITLE:   ChildProcesses.js
|PURPOSE: Wrapper to handle child processes. Assumes data coming from
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  nodemailer, GetHTML library
|REVISION HISTORY:
|      *LJW 2/19/2016 - created
-----------------------------------------------------------------------------------------*/
var ChildProcesses = function(options) {
  options = options || {};

  this.command = (typeof options==="string") ? options : options.command;
  this.args = (typeof options==="string") ? [] : this.defineArgs(options.args);
  this.timeout = (typeof options==="string") ? null : options.timeout;        //optional time limit in seconds to wait for child process to finish before terminating it

  this.child = null;
  this.data = "";
}

/*-----------------------------------------------------------------------------------------
|NAME:      run (PUBLIC)
|DESCRIPTION:  Runs the child process given the command information.
|PARAMETERS:  1. cb(REQ): callback information we will call once complete. NOTE: if a message
|                 is received from the child and it's an object with an error property populated,
|                 we kill that process immediately and send the error. Otherwise, we wait until the
|                 child process is complete then send the data in the 2nd argument.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
ChildProcesses.prototype.run = function(cb) {
  var self = this;
  var isDone = false;

  try {
    this.child = fork(this.command,this.args);

    this.child.on("message",function(info) {
      if (typeof info==="object" && info.error) {
        self.child.kill();
        isDone = true;
        cb(info.error);
      } else {
        self.data = (typeof info==="string") ? self.data + info : info;
      }
    });

    this.child.on("error",function(err) {
      self.child.kill();
      isDone = true;
      cb(err);
    });

    this.child.on("disconnect",function() {
      if (!isDone) {
        isDone = true;
        cb(null,self.data);
      }
    });

    //if there's a timeout we want to wait
    //start a timer and terminate the child process
    //if it hasn't completed by the timer.
    if (typeof this.timeout==="number") {
      setTimeout(function() {
        if (!isDone) {
          self.child.kill();
          isDone = true;
          cb("The alotted time for the child process to complete, " + self.timeout + " seconds, has passed.");
        }
      },this.timeout * 1000);
    }
  } catch(err) {
    cb(err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      defineArgs (PUBLIC)
|DESCRIPTION:  Runs the child process given the command information.
|PARAMETERS:  1. args(REQ): the pipe-delimited arguments string we'll convert to an array
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <array>:
-----------------------------------------------------------------------------------------*/
ChildProcesses.prototype.defineArgs = function(args) {
  if (args) {
    return (typeof args==="string")
      ? args.split("|")
      : ((args instanceof Array)
        ? args
        : [])
  } else return [];
}

module.exports = ChildProcesses
