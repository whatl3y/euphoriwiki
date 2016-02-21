var fs = require("graceful-fs");
var path = require("path");
var crypto = require("crypto");
var async = require("async");
var Object = require("../public/js/Object_prototypes.js");

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
DirectoryProcessor=function(options) {
  options = options || {};
  
  this.dirpath = options.dirpath;
  this.savepath = options.savepath || path.join(__dirname,"..","files","diff");
}

/*-----------------------------------------------------------------------------------------
|NAME:      processDir (PUBLIC)
|DESCRIPTION:  Takes the directory and "processes" it, effectively hashing all files and optionally
|           descending in all directories recursively hashing all nested files.
|PARAMETERS:  1. options(REQ): options for the processing
|                   options.dirpath(REQ):  the file path we're starting with
|                   options.recurse(OPT): boolean indicating if we're descending in all subdirectories to process those files as well
|                   options.encoding(OPT): an optional encoding to save the file information if we want to save the file data
|                           If omitted, we will not get the file data for each file.
|             2. cb(REQ): the callback to call after finished processing with an object of all processed files.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.processDir=function(options,cb) {
  options = options || {};
  
  var dirpath = options.dirpath || this.dirpath;
  var recurse = options.recurse || false;
  var encoding = options.encoding || null;
  
  var self = this;
  var ret = [];
  
  fs.readdir(dirpath,function(err,files) {
    if (err) cb(err);
    else {
      async.each(files,function(file,callback) {
        var fp = self.makePath([dirpath,file]);
        
        fs.stat(fp,function(err,stats) {
          if (stats.isDirectory()) {
            if (recurse) self.processDir({dirpath:fp, recurse:true, encoding:encoding},function(_e,r) {
              if (_e) callback(_e)
              else {
                ret = ret.concat(r);
                callback();
              }
            });
            else callback();
          } else {
            var o = {
              parentdir: dirpath,
              filename: file,
              info: {
                filesize: stats.size,
                birthtime: stats.birthtime
              }
            };
            
            self.processFile(fp,function(e,r) {
              if (e) callback(e);
              else {
                o.info = Object.merge(o.info,r);
                
                ret.push(o);
                callback()
              }
            },encoding);
          }
        });
      },function(e) {
        cb(e,ret);
      });
    }
  });
}

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
DirectoryProcessor.prototype.processFile=function(filepath,cb,encoding) {
  var self=this;
  
  if (this.fileOrDirExists(filepath,"file")) {
    self.fileToHash(filepath,function(e,hash) {
      if (e) cb(e);
      else {
        var o = {};
        o.hash = hash;
        
        if (encoding) {
          encoding = (typeof encoding==="string") ? encoding : null;
          
          fs.readFile(filepath,encoding,function(_e,data) {
            o.data = data || "";
            cb(_e,o);
          });
        } else {
          cb(null,o);
        }
      }
    });
  } else {
    cb("Is not a file");
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      stringToHash (PUBLIC)
|DESCRIPTION:  Takes a string and creates an MD5 hash from it.
|PARAMETERS:  1. string(OPT): The string we're hashing.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>: a string that is MD5 hashed
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.stringToHash=function(string) {
  var md5Sum = crypto.createHash("md5");
  md5Sum.update(string);
  return md5Sum.digest("hex");
}

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
DirectoryProcessor.prototype.fileToHash=function(filePath,cb) {
  filePath = filePath || this.dirpath;
  
  var md5Sum = crypto.createHash("md5");
  var s = fs.ReadStream(filePath);
  
  s.on("data",function(data) {md5Sum.update(data);});
  s.on("end",function() {cb(null,md5Sum.digest("hex"));});
}

/*-----------------------------------------------------------------------------------------
|NAME:      fileOrDirExists (PUBLIC)
|DESCRIPTION:  Determines if a directory is a directory, and also exists. Can also check if a path
|           is a file and if it exists. DEFAULT: check for directory
|PARAMETERS:  1. dir(REQ): the path, either a string delimited by a normal delimiter, or an array
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <true/false>: whether a path is a directory AND it exists
-----------------------------------------------------------------------------------------*/
DirectoryProcessor.prototype.fileOrDirExists=function(dir,type) {
  type = type || "directory";
  
  try {
    var stat = fs.statSync(dir);
    return (type == "file") ? stat.isFile() : stat.isDirectory();
    
  } catch(e) {
    return false;
  }
}

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
DirectoryProcessor.prototype.makePath=function(p,ary) {
  if (!p && !ary) {
    return false;
  } else if (p && ary) {
    if (typeof ary[0]==="string") {
      p = path.join(p,ary[0]);
      ary.shift();
      
      return this.makePath(p,ary);
    } else {
      return p;
    }
    
  } else if (p && !ary) {
    
    ary = (p instanceof Array) ? p : p.split(/[\\\/,\|\^]{1,2}/g);
    p = "";
    
    if (ary.length <= 1) return path.join(ary[0] || "");
    else {
      p = path.join(ary[0]);
      ary.shift();
      
      return this.makePath(p,ary);
    }
  }
  
  return p;
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=DirectoryProcessor;
}
//-------------------------------------------------------