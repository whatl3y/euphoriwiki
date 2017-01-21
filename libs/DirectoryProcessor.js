"use strict";

var fs = require("graceful-fs");
var path = require("path");
var async = require("async");
var Encryption = require("./Encryption.js");
var Object = require("../src/public/js/extras/Object_prototypes.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    DirectoryProcessor.js
|PURPOSE:  Handles all things to do with getting information about a wiki page.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|
|ASSUMES:  mongodb native driver in nodejs
|REVISION HISTORY:
|      *LJW 1/28/2016 - created
-----------------------------------------------------------------------------------------*/
var DirectoryProcessor = function DirectoryProcessor(options) {
  options = options || {};

  this.dirpath = options.dirpath;
  this.savepath = options.savepath || path.join(__dirname, "..", "files", "diff");
};

/*-----------------------------------------------------------------------------------------
|NAME:      processDir (PUBLIC)
|DESCRIPTION:  Takes the directory and "processes" it, effectively hashing all files and optionally
|           descending in all directories recursively hashing all nested files.
|PARAMETERS:  1. options(REQ): options for the processing
|                   options.dirpath(REQ):  the file path we're starting with
|                   options.recurse(OPT): boolean indicating if we're descending in all subdirectories to process those files as well
|                   options.encoding(OPT): an optional encoding to save the file information if we want to save the file data
|                           If omitted, we will not get the file data for each file.
|                   options.processIndividually(OPT): boolean determining if we're going to use an individual callback or append info to an array
|             2. cb(REQ): the callback to call after finished processing with an object of all processed files.
|             3. cbIndividual(OPT): an optional callback function that will be used to process each file instead of appending its contents to an array
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.processDir = function (options, cb, cbIndividual) {
  options = options || {};

  var dirpath = options.dirpath || this.dirpath;
  var recurse = options.recurse || false;
  var encoding = options.encoding || null;
  var individual = options.processIndividually || false;

  var self = this;
  var ret = [];

  var process = function process(data, foo) {
    try {
      if (individual) cbIndividual(data);else {
        if (foo == "push") ret[foo](data);else ret = ret[foo](data);
      }
    } catch (err) {}
  };

  fs.readdir(dirpath, function (err, files) {
    if (err) cb(err);else {
      async.each(files, function (file, callback) {
        var fp = self.makePath([dirpath, file]);

        fs.stat(fp, function (err, stats) {
          if (stats.isDirectory()) {
            if (recurse) {
              self.processDir(Object.merge(options, { dirpath: fp }), function (_e, r) {
                if (_e) callback(_e);else {
                  process(r, "concat");
                  callback();
                }
              }, cbIndividual);
            } else callback();
          } else {
            var o = {
              parentdir: dirpath,
              filename: file,
              info: {
                filesize: stats.size,
                birthtime: stats.birthtime
              }
            };
            self.processFile(fp, function (e, r) {
              if (e) callback(e);else {
                o.info = Object.merge(o.info, r);

                process(o, "push");
                callback();
              }
            }, encoding);
          }
        });
      }, function (e) {
        cb(e, ret.length ? ret : []);
      });
    }
  });
};

/*-----------------------------------------------------------------------------------------
|NAME:      processFile (PUBLIC)
|DESCRIPTION:  Takes a file and processes it
|PARAMETERS:  1. filepath(REQ): the file path we're starting with
|             3. cb(REQ): the callback to call after finished processing with an object of all processed files.
|             4. encoding(OPT): an optional encoding to save the file information if we want to save the file data
|                 If omitted, we will not get the file data for each file.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.processFile = function (filepath, cb, encoding) {
  var self = this;

  if (this.fileOrDirExists(filepath, "file")) {
    self.fileToHash(filepath, function (e, hash) {
      if (e) cb(e);else {
        var o = {};
        o.hash = hash;

        if (encoding) {
          encoding = typeof encoding === "string" ? encoding : null;

          fs.readFile(filepath, encoding, function (_e, data) {
            o.data = data || "";
            cb(_e, o);
          });
        } else {
          cb(null, o);
        }
      }
    });
  } else {
    cb("Is not a file");
  }
};

/*-----------------------------------------------------------------------------------------
|NAME:      stringToHash (PUBLIC)
|DESCRIPTION:  Takes a string and creates an MD5 hash from it.
|PARAMETERS:  1. string(OPT): The string we're hashing.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>: a string that is MD5 hashed
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.stringToHash = function (string) {
  return new Encryption().stringToHash(string);
};

/*-----------------------------------------------------------------------------------------
|NAME:      fileToHash (PUBLIC)
|DESCRIPTION:  Takes a file path and creates an MD5 hash from it.
|PARAMETERS:  1. filePath(OPT): The file path of the file we're hashing.
|             2. cb(REQ): the callback to call after uploading a file
|                     cb(err,hash)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.fileToHash = function (filePath, cb) {
  return new Encryption().fileToHash(filePath, cb);
};

/*-----------------------------------------------------------------------------------------
|NAME:      fileOrDirExists (PUBLIC)
|DESCRIPTION:  Determines if a directory is a directory, and also exists. Can also check if a path
|           is a file and if it exists. DEFAULT: check for directory
|PARAMETERS:  1. dir(REQ): the path, either a string delimited by a normal delimiter, or an array
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <true/false>: whether a path is a directory AND it exists
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.fileOrDirExists = function (dir, type) {
  dir = dir || this.dirpath;
  type = type || "directory";

  try {
    var stat = fs.statSync(dir);
    return type == "file" ? stat.isFile() : stat.isDirectory();
  } catch (e) {
    return false;
  }
};

/*-----------------------------------------------------------------------------------------
|NAME:      makePath (PUBLIC)
|DESCRIPTION:  Takes a file path and makes it a path based on OS we're on.
|PARAMETERS:  1. p(REQ): the path, either a string delimited by a normal delimiter, or an array
|             2. ary(OPT): an array to be passed back recursively that will be shifted each time we call it
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>: the new path
|             false: if no path provided or error
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.makePath = function (p, ary) {
  if (!p && !ary) {
    return false;
  } else if (p && ary) {
    if (typeof ary[0] === "string") {
      p = path.join(p, ary[0]);
      ary.shift();

      return this.makePath(p, ary);
    } else {
      return p;
    }
  } else if (p && !ary) {

    ary = p instanceof Array ? p : p.split(/[\\\/,\|\^]{1,2}/g);
    p = "";

    if (ary.length <= 1) return path.join(ary[0] || "");else {
      p = path.join(ary[0]);
      ary.shift();

      return this.makePath(p, ary);
    }
  }

  return p;
};

module.exports = DirectoryProcessor;