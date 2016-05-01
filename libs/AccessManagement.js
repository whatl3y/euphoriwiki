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
|DESCRIPTION:  Determines if the user specified is allowed to edit the page within the scope of a page path or if administrator.
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
  var editOnly = (options.editOnly===false) ? false : true;
  
  var self = this;
  
  async.parallel([
    function(callback) {
      self.isPageAdmin({username:username, path:path, editOnly:editOnly},function(e,isAdmin) {
        callback(e,isAdmin);
      });
    },
    function(callback) {
      self.isWikiAdmin(username,function(e,isAdmin) {
        callback(e,isAdmin);
      });
    }
  ],
    function(err,results) {
      if (err) cb(err);
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
|             2. cb(REQ): callback function to return
|                       cb(<err>,<true/false>)
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
|DESCRIPTION:  Determines if the user specified is a page admin.
|PARAMETERS:  1. options(REQ): options to check if a user is an administrator on a particular page.
|                     options.username
|                     options.path: path for the page we're checking.
|                     options.editOnly: If true, only returns back if the user is allowed to edit
|                             the page, but not necessarily whether he is truly a page administrator.
|                             If not provided, this will return only whether the user can edit the page.
|                             Example is if there are no page administrators specified up the page tree
|              2. cb(REQ): callback function to return
|                           cb(<err>,<true/false>)
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.isPageAdmin = function(options,cb) {
  var username = options.username;
  var path = options.path;
  var editOnly = options.editOnly || false;
  
  var self = this;
  
  if (!username || !path) {
    cb(null,false);
  } else {
    var pathFilter = this.createInheritanceFilter(path);
    pathFilter = (typeof pathFilter==="object" && pathFilter["$or"]) ? pathFilter : {path:path};
    
    var oFilters = {$and: [pathFilter, {"settings.admins":{$exists:1}}]};
    
    this.db.collection("wikicontent").find(oFilters,{"settings.admins":1}).toArray(function(e,pages) {
      if (e) cb(e);
      else {
        if (pages.length) {
          pages = self.sortWikiResults(pages);
          
          var isAdmin = null;
          _.each(pages,function(p) {
            if (!(p.settings.admins instanceof Array) || !p.settings.admins.length) return;
            else {
              _.each(p.settings.admins,function(adminUsername) {
                if (isAdmin != null) return;
                else if (adminUsername.toLowerCase() == username.toLowerCase()) isAdmin = true;
              });
              
              if (isAdmin == null) isAdmin = false;
            }            
          });
          
          cb(null,((isAdmin == null) ? editOnly : isAdmin));
          
        } else cb(null,editOnly);
      }
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      onlyViewablePaths (PUBLIC)
|DESCRIPTION:  Takes an array of paths and username and filters the list of paths based on whether 
|             the specified user is either an administrator or can view these pages.
|PARAMETERS:  1. options(REQ): options to check if a user is an administrator on a particular page.
|                     options.username
|                     options.paths: EITHER an array of paths we're filtering, or an array of objects where
|                           the 'path' field is the key where the path lives.
|                     options.session: session object to check logged in status
|                     options.adminOnly: instead of determining if the user can view the page, if this
|                           is set we will only see if the user is an administrator of the page
|             2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.onlyViewablePaths = function(options,cb) {
  var username = options.username;
  var paths = options.paths || [];
  var session = options.session;
  var adminOnly = options.adminOnly || false;
  
  var self = this;
  
  if (paths.length) {
    var asyncParallel = [];
    _.each(paths,function(pageOrPath,_i) {
      var path = (typeof pageOrPath==="object") ? pageOrPath.path : pageOrPath;
      
      if (path) {
        asyncParallel.push(function(callback1) {
          async.parallel([
            function(callback2) {
              self.isAdmin({username:username, path:path, editOnly:false},function(e,isAdmin) {
                callback2(e,isAdmin);
              });
            },
            function(callback2) {
              self.canViewPage({session:session, username:username, path:path},function(e,canView) {
                callback2(e,canView);
              });
            }
          ],
            function(err,results) {
              callback1(err,{
                path: pageOrPath,
                canView: results[0] || results[1]
              });
            }
          );
        });
      }
    });
    
    async.parallel(asyncParallel,
      function(err,results) {
        if (err) cb(err);
        else {
          try {
            var filteredPages = results.filter(function(_p) {
              return _p.canView;
            }).map(function(__p) {
              return __p.path;
            });
            
            cb(null,filteredPages);
          } catch(_err) {
            cb(_err);
          }
        }
      }
    );
    
  } else cb(null,[]);  
}

/*-----------------------------------------------------------------------------------------
|NAME:      canViewPage (PUBLIC)
|DESCRIPTION:  Determines if the user specified is allowed to view a page based on his credentials and
|             those configured in the wiki page.
|PARAMETERS:  1. options(REQ): options to check if a user is an administrator on a particular page.
|                     options.session: the session object in case we need to see if user is logged in
|                     options.username: username we're checking for access.
|                     options.path: path for the page we're checking.
|              2. cb(REQ): callback function to return back once we determine view scope
|                         cb(<err>,<true/false>)
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.canViewPage = function(options,cb) {
  options = options || {};
  
  var self = this;
  
  var session = options.session;
  var username = options.username;
  var path = options.path;
  
  var pathFilter = this.createInheritanceFilter(path);
  pathFilter = (typeof pathFilter==="object" && pathFilter["$or"]) ? pathFilter : {path:path};
  
  var oFilters = {$and: [pathFilter, {"settings.viewscope":{$exists:1}}]};
    
  this.db.collection("wikicontent").find(oFilters,{"settings.viewscope":1}).toArray(function(e,pages) {
    if (e) cb(e);
    else {
      if (pages.length) {
        pages = self.sortWikiResults(pages);
        
        var canView = null;
        async.each(pages,function(p,callback1) {
          var scopes = p.settings.viewscope;
          
          async.each(scopes,function(scope,callback2) {
            var evalFunction = self.getMemberScopeEvalFunction(scope.type);
            
            evalFunction(username,path,scope.data || session,function(__err,result) {
              if (!__err) {
                if (canView == null && !result) canView = false;
                else if (result) canView = true;
              }
              
              callback2(__err);
            });
          },
          function(_err) {
            if (_err) callback1(_err);
            else {
              canView = (canView == null) ? true : canView;
              callback1();
            }
          });          
        },
        function(err) {
          cb(err,canView);
        });
        
      } else cb(null,true);
    }
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      getMemberScopeEvalFunction (PUBLIC)
|DESCRIPTION:  Based on the member scope type, will return a function that can be evaluated
|             to determine if a condition passes or fails the scoping based on a set of parameters.
|PARAMETERS:  1. type(REQ): the member scope type
|SIDE EFFECTS:  Nothing
|ASSUMES:    _, async
|RETURNS:    <function>: function that will be executed with arguments from data to evaluate member scope.
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.getMemberScopeEvalFunction = function(type) {
  return this.memberScopeTypeFunctionMap()[type].eval;
}

/*-----------------------------------------------------------------------------------------
|NAME:      memberScopeTypeFunctionMap (PUBLIC)
|DESCRIPTION:  Returns an object of type->function map to be used to get eval function.
|PARAMETERS:  Nothing
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <object>: object of functions
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.memberScopeTypeFunctionMap = function() {
  var self = this;
  
  return {
    loggedin: {
      name: "User is Logged In",
      eval: function(username,path,session,cb) {
        var Auth = require("./Authentication.js");
        
        try {
          var isLoggedIn = new Auth({session:session}).isLoggedIn();
          cb(null,isLoggedIn);
        } catch(err) {
          cb(err);
        }
      }
    },
    
    groupmembership: {
      name: "User is in Specified Group(s)",
      eval: function(username,path,aGroupDNs,cb) {
        if (!username) {
          cb(null,false);
          return;
        }
        
        aGroupDNs = aGroupDNs || [];
        
        if (aGroupDNs.length) {
          var Auth = require("./Authentication.js");
          var asyncParallelFunctions = [];
          _.each(aGroupDNs,function(dn) {
            asyncParallelFunctions.push(function(callback) {
              new Auth().isUserMemberOf({username:username, group:dn},function(e,result) {
                callback(e,result);
              });
            });
          });
          
          async.parallel(asyncParallelFunctions,
            function(err,results) {
              if (err) cb(err);
              else {
                var isMember = false;
                for (var _i=0;_i<results.length;_i++) {
                  isMember = isMember || results[_i];
                }
                
                cb(null,isMember);
              }
            }
          );
        } else cb(null,true);
        
      }
    },
    
    username: {
      name: "Specific Users You Specify",
      eval: function(username,path,aUsers,cb) {
        if (!username) {
          cb(null,false);
          return;
        }
        
        aUsers = aUsers || [];
        
        try {
          var match = false;
          _.each(aUsers,function(u) {
            match = match || (username.toLowerCase() == u.toLowerCase());
          });
          
          cb(null,match);
          
        } catch(err) {
          cb(err);
        }
      }
    },
    
    wikiadmin: {
      name: "Wiki Administrator",
      eval: function(username,path,temp,cb) {
        if (!username) {
          cb(null,false);
          return;
        }
        
        self.isWikiAdmin(username,function(e,isAdmin) {
          cb(e,isAdmin);
        });
      }
    },
    
    pageadmin: {
      name: "Page Administrator",
      eval: function(username,path,temp,cb) {
        if (!username) {
          cb(null,false);
          return;
        }
        
        self.isPageAdmin({username:username, path:path},function(e,isAdmin) {
          cb(e,isAdmin);
        });
      }
    },
    
    upnsuffix: {
      name: "UPN Suffix (e.x. @upn.local)",
      eval: function(username,path,data,cb) {
        cb(null,true);
      }
    },
    
    emailsuffix: {
      name: "Email Suffix (e.x. @email.com)",
      eval: function(username,path,data,cb) {
        cb(null,true);
      }
    }
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      sortWikiResults (PUBLIC)
|DESCRIPTION:  Sorts an array of mongodb results of wiki pages to have the lowest children first,
|             and ascend up the parent wiki tree to the highest parent.
|PARAMETERS:  1. ary(OPT): array of wiki pages ([{path:<path>,...},{path:<path>,...},...])
|             2. parentsFirst(OPT): if true, will sort parents first, otherwise will sort children first
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <array>: a sorted array of mongodb results
|           <Error>: error that occurred
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.sortWikiResults=function(ary,parentsFirst) {
  ary = ary || [];
  parentsFirst = parentsFirst || false;
  
  try {
    return ary.sort(function(a,b) {
      return ((parentsFirst) ? 1 : -1)*(a.path.length - b.path.length);
    });
    
  } catch(err) {
    return err;
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      createInheritanceFilter (PUBLIC)
|DESCRIPTION:  This will create and return an object that can be included in a mongodb query
|             to look for information within the current path OR any of the parent paths. This is
|             relevant for looking for whether a particular condition exists in the current path
|             or any parents for inheritance
|PARAMETERS:  1. path(OPT): the path we're creating the filter for
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <object>: an $or mongodb filter object to be appended to other filters.
|           <Error>: error that occurred
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.createInheritanceFilter=function(path) {
  try {
    path = path || "";
    
    var pathAry = path.split("/");
    pathAry.shift();
    
    var pathString = "";
    var oFilter = {$or:[]};
    
    oFilter["$or"] = _.map(pathAry,function(piece) {
      pathString += "/" + (piece || "");
      return {path:pathString};
    });
    
    return oFilter;
    
  } catch(err) {
    return err;
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      noop (PUBLIC)
|DESCRIPTION: noop function
|PARAMETERS:  None
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <function>: a blank function
-----------------------------------------------------------------------------------------*/
AccessManagement.prototype.noop=function() {
  return function(){};
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=AccessManagement;
}
//-------------------------------------------------------