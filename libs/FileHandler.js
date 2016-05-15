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
  options = options || {};
  
  var filePath = options.path;
  var fileName = options.filename;
  var newFileName = (options.exactname) ? fileName : false;
  var readStream = options.readStream || fs.createReadStream(filePath);
  
  var lastPeriod = fileName.lastIndexOf(".");
  newFileName = newFileName || fileName.substring(0,lastPeriod) + "_" + Date.now() + fileName.substring(lastPeriod);
  
  var writeStream = this.writeStream(newFileName);
  
  //setup event handlers for file stream
  writeStream.on("error",function(err) {cb(err);});
  writeStream.on("close",function(file) {cb(null,newFileName);});
  
  readStream.pipe(writeStream);
}

/*-----------------------------------------------------------------------------------------
|NAME:      getFile (PUBLIC)
|DESCRIPTION:  Gets a file from GridFS based on file name
|PARAMETERS:  1. options(OPT): options
|                   options.filename
|                   options.encoding: if specified, will return the data based on encoding type (common, 'binary', 'utf8', etc.)
|             2. cb(REQ): the callback to call after uploading a file
|                     cb(err,<varies based on encoding>)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
FileHandler.prototype.getFile=function(options,cb) {
  options = options || {};
  
  var filename = options.filename || "";
  var encoding = options.encoding || "";
  
  try {
    var readStream = this.gfs.createReadStream({filename:filename});
    if (encoding) readStream.setEncoding(encoding);
    
    var data = "";
    readStream.on("data",function(chunk) {
      data += chunk;
    });
    
    readStream.on("end",function() {
      cb(null,data);
    });
    
    readStream.on("error",function(e) {
      cb(e);
    });
    
  } catch(err) {
    cb(err);
  }
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
  try {
    var fileName = options.filename || "";
    this.gfs.remove({filename:fileName},cb);
    
  } catch(err) {
    cb(err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      writeStream (PUBLIC)
|DESCRIPTION:  Will upload a new file to GridFS
|PARAMETERS:  1. filename(OPT): the file name that the file will be stored as in Grid FS.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <stream>
-----------------------------------------------------------------------------------------*/
FileHandler.prototype.writeStream=function(newFileName) {
  return this.gfs.createWriteStream({filename: newFileName});
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=FileHandler;
}
//-------------------------------------------------------