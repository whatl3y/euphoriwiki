var fs = require("fs");
var mongo = require("mongodb");
var Grid = require('gridfs-stream');

/*-----------------------------------------------------------------------------------------
|TITLE:    FileHandler.js
|PURPOSE:  Handles all things to do with getting information about a wiki page.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      
|ASSUMES:  mongodb native driver in nodejs
|REVISION HISTORY:  
|      *LJW 1/28/2016 - created
-----------------------------------------------------------------------------------------*/
FileHandler=function(options) {
  options = options || {};
  
  this.db = options.db;
  this.gfs = Grid(this.db, mongo);
}

/*-----------------------------------------------------------------------------------------
|NAME:      findFiles (PUBLIC)
|DESCRIPTION:  Finds a file based
|PARAMETERS:  1. options(OPT): callback function after we find the pages.
|             2. cb(REQ): the callback to call after uploading a file
|                     cb(err)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
FileHandler.prototype.findFiles=function(options,cb) {
  var options = options || {};
  
  var method = (options.one) ? "findOne" : "find";
  var fileName = options.filename;
  
  this.gfs[method]({filename:fileName},function(err,file) {
    if (err) cb(err);
    else cb(null,file);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      uploadFile (PUBLIC)
|DESCRIPTION:  Will upload a new file to GridFS
|PARAMETERS:  1. options(OPT): callback function after we find the pages.
|             2. cb(REQ): the callback to call after uploading a file
|                     cb(err,newFileName)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
FileHandler.prototype.uploadFile=function(options,cb) {
  var filePath = options.path;
  var fileName = options.filename;
  
  var lastPeriod = fileName.lastIndexOf(".");
  var newFileName = fileName.substring(0,lastPeriod) + "_" + Date.now() + fileName.substring(lastPeriod);
  
  var writeStream = this.gfs.createWriteStream({filename: newFileName});
  
  //setup event handlers for file stream
  writeStream.on("error",function(err) {cb(err);});
  writeStream.on("close",function(file) {cb(null,newFileName);});
  
  fs.createReadStream(filePath).pipe(writeStream);
}

/*-----------------------------------------------------------------------------------------
|NAME:      deleteFile (PUBLIC)
|DESCRIPTION:  Deletes a file to GridFS
|PARAMETERS:  1. options(OPT): callback function after we find the pages.
|             2. cb(REQ): the callback to call after uploading a file
|                     cb(err)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
FileHandler.prototype.deleteFile=function(options,cb) {
  var fileName = options.filename;
  
  this.gfs.remove({filename:fileName},function(err) {
    cb(err);
  });
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=FileHandler;
}
//-------------------------------------------------------