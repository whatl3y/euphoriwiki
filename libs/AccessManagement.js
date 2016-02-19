var config = require('./config.js');
var _ = require("underscore");
var async = require("async");

/*-----------------------------------------------------------------------------------------
|TITLE:    AccessManagement.js
|PURPOSE: Handles getting access to the wiki and determining access levels.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  socket.io
|REVISION HISTORY:  
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
AccessManagement = function(options) {
  this.db = options.db;
}

/*-----------------------------------------------------------------------------------------
|NAME:      isAdmin (PUBLIC)
|DESCRIPTION:  Determines if the user specified is an administrator within the scope of a page path.
|             This method will return true in the callback if the user is a page OR wiki admin, false otherwise
|PARAMETERS:  1. options(REQ): options to check if a user is an administrator on a particular page.
|                     options.username
|                     options.path: path for the page we're checking.
|             2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.isAdmin = function(options,cb) {
  var username = options.username;
  var path = options.path;
  
  async.parallel([
    function(callback) {
      this.isPageAdmin({username:username, path:path},function(e,isAdmin) {
        callback(e,isAdmin);
      });
    },
    function(callback) {
      this.isWikiAdmin(username,function(e,isAdmin) {
        callback(e,isAdmin);
      });
    }
  ],
    function(err,results) {
      if (err) cb(null,false);
      else {
        var isAdmin = results[0] || results[1] || false;
        cb(null,isAdmin);
      }
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      isWikiAdmin (PUBLIC)
|DESCRIPTION:  Determines if the user specified is a wiki administrator.
|PARAMETERS:  1. username(REQ): the username of the user we're checking for wiki admin access
|             2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.isWikiAdmin = function(username,cb) {
  if (!username) cb(null,false);
  else {
    this.db.collection("adminsettings").find({domid:"wikiadmins","value.username":username},{_id:1}).toArray(function(e,admin) {
      if (e) cb(e);
      else if (admin.length) cb(null,true);
      else cb(null,false);
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      isPageAdmin (PUBLIC)
|DESCRIPTION:  Determines if the user specified is a wiki administrator.
|PARAMETERS:  1. options(REQ): options to check if a user is an administrator on a particular page.
|                     options.username
|                     options.path: path for the page we're checking.
|              2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.isPageAdmin = function(options,cb) {
  var username = options.username;
  var path = options.path;
  
  if (!username || !path) {
    cb(null,false);
  } else {
    var pathAry = path.split("/");
    pathAry.shift();
    
    var pathString = "";
    var oFilters = {$and: [{$or:[]}, {"settings.admins":{$exists:1}}]};
    
    oFilters["$and"][0]["$or"] = _.map(pathAry,function(piece) {
      pathString += "/" + piece;
      return {path:pathString};
    });
    
    this.db.collection("wikicontent").find(oFilters,{"settings.admins":1}).toArray(function(e,pages) {
      if (e) cb(e);
      else {
        if (pages.length) {
          var isAdmin = false;
          _.each(pages,function(p) {
            if (!(p.settings.admins instanceof Array)) isAdmin=true;
            else {
              _.each(p.settings.admins,function(adminUsername) {
                if (adminUsername.toLowerCase() == username.toLowerCase()) isAdmin = true;
              });
            }            
          });
          
          cb(null,isAdmin);
          
        } else cb(null,true);
      }
    });
  }
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=AccessManagement;
}
//-------------------------------------------------------