var _ = require("underscore");
var async = require("async");
var FileHandler = require("./FileHandler.js");
var CodeRunner = require("./CodeRunner.js");
var config = require('./config.js');
var Object = require("../public/js/Object_prototypes.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    WikiHandler.js
|PURPOSE:  Handles all things to do with getting information about a wiki page.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      
|ASSUMES:  mongodb native driver in nodejs
|REVISION HISTORY:  
|      *LJW 1/28/2016 - created
-----------------------------------------------------------------------------------------*/
WikiHandler=function(options) {
  options = options || {};
  
  this.sanitizePath(options.path);
}

/*-----------------------------------------------------------------------------------------
|NAME:      initQueries (PUBLIC)
|DESCRIPTION:  When we start the wiki server, there are initial queries we run to execute code and
|             evaluate information based on system settings. This gets the current queries,
|             runs them, and returns them;
|PARAMETERS:  1. cb(OPT): callback function after we get the information.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.initQueries=function(cb) {
  async.waterfall([
    function(_callback) {
      config.mongodb.db.collection("initializequeries").find().toArray(function(err,queries) {
        _callback(err,queries);
      });
    },
    function(queries,_callback) {
      config.mongodb.MDB.findRecursive({
        db: config.mongodb.db,
        array: queries
      },function(err,oData) {
        _callback(err,queries,oData);
      });
    }
  ],
    function(err,queries,oData) {
      if (err) return cb(err);
      
      try {
        cb(null,{queries:queries, oData:oData});
      } catch(err) {
        cb(err);
      }
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      getSubPages (PUBLIC)
|DESCRIPTION:  Gets all the information about a page.
|PARAMETERS:  1. cb(OPT): callback function after we find the pages.
|             2. returnAry(OPT): boolean indicating whether, instead of a new object
|                 with children nested and represented as keys in an object, we will simply
|                 return the array of all documents returned from the MongoDB query.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getSubPages=function(cb,returnAry) {
  var self=this;
  
  var children = new RegExp("^"+this.escapePath()+"/.+$");      //all nested children
  //var children = new RegExp("^"+this.escapePath()+"/[^/]+$");     //only direct children
  
  this.getPage({filters:{path:children},fields:{path:1,description:1,pageViews:1}},function(_e,pages) {
    if (_e) cb(_e);
    else {
      if (returnAry) cb(null,pages);
      else {
        var aryToNestedObj = function(ary,obj,val) {
          obj = obj || {};
          val = val || "";
          
          var key = ary[0];
          var newAry = ary.slice(1);
          obj[key] = {};
          val += "/" + key;
          
          if (newAry.length > 1) obj[key] = aryToNestedObj(newAry,{/*value:val*/},val);
          else obj[key][newAry[0]] = {/*value:val*/};
          
          return obj;
        };
        
        var oPages = {};
        var pagesSplit = [];
        var thisPathPagesSplit = self.path.split("/").slice(1);
        for (var _i=0;_i<pages.length;_i++) {
          
          pagesSplit = pages[_i].path.split("/").slice(1);
          //if (pagesSplit.length <= thisPathPagesSplit.length) continue;
          
          oPages = Object.merge(oPages,aryToNestedObj(pagesSplit));
        }
        
        cb(null,oPages);
      }
    }
  })
}

/*-----------------------------------------------------------------------------------------
|NAME:      getPage (PUBLIC)
|DESCRIPTION:  Gets all the information about a page.
|PARAMETERS:  1. options(OPT): Either a string, which represents the page of the page we're
|          retrieving information about, or an object to help us filter on information
|          for the query to get the page information.
|              options.archive: optional boolean indicating if we should pull from wikicontent collection or wikicontent_archive (history
|              options.path
|              options.filters: optional filter object to be used in mongodb query
|              options.fields: object of fields we want to return
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getPage=function(options,cb) {
  cb = (typeof options==="function") ? options : cb;
  options = (typeof options==="function") ? {} : (options || {});
  
  var coll = (typeof options==="string") ? "wikicontent" : ((options.archive) ? "wikicontent_archive" : "wikicontent");
  var path = (typeof options==="string") ? options : (options.path || this.path);
  var filters = (typeof options==="string") ? {path:path} : (options.filters || {path:path});
  var fields = (typeof options==="string") ? {} : (options.fields || {});
  var sort = (typeof options==="string") ? {} : (options.sort || {});
  
  config.mongodb.db.collection(coll).find(filters,fields).sort(sort).toArray(function(_e,pageInfo) {
    if (_e) cb(_e);
    else cb(null,pageInfo);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      getPageContent (PUBLIC)
|DESCRIPTION:  Gets the final HTML of a page.
|PARAMETERS:  1. cb: callback function
|                 cb(<error/null>,<html>,<template config object/null>)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getPageContent=function(cb) {
  var self = this;
  
  async.waterfall([
    function(callback) {
      self.getPage({fields:{content_html:1, template:1}}, function(e,page) {
        callback(e,page);
      });
    },
    function(page,callback) {
      if (page && page.length) {
        if (typeof page[0].template === "object") {
          return callback(null,page[0].template.templateId,null);
        }
        
        return callback(null,null,page[0].content_html);
      }
      
      return callback(null,null,null);
    },
    function(templateId,html,callback) {
      if (!templateId) return callback(null,html);
      
      try {
        var ObjectId = require('mongodb').ObjectID;
        
        async.waterfall([
          function(_callback) {
            config.mongodb.db.collection("wikitemplates").find({ _id:ObjectId(templateId) },{file:1,config:1}).toArray(function(e,result) {
              _callback(e,result);
            });
          },
          function(template,_callback) {
            var fh = new FileHandler({db:config.mongodb.db});
            
            fh.getFile({filename:template[0].file, encoding:"utf8"},function(e,result) {
              _callback(e,result,template[0].config);
            });
          }
        ],
          function(err,html,config) {
            return callback(err,result,config);
          }
        );
        
      } catch(e) {
        return callback(e);
      }
    }
  ],
    function(err,html,templateConfig) {
      return cb(err,html,templateConfig || null);
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      updatePagesWithCallback (PUBLIC)
|DESCRIPTION:  Will run a query to get all pages that match a set of filters and will run a callback
|             to update each page individually. This is good for updating the path for example based on
|             a regular expression.
|PARAMETERS:  1. options(OPT): Either a string, which represents the page of the page we're
|          retrieving information about, or an object to help us filter on information
|          for the query to get the page information.
|              options.path
|              options.filters: optional filter object to be used in mongodb query
|              options.fields: object of fields we want to return
|             2. singleDocUpdateCB (REQ): the callback function we'll run against each document we find.
|                   NOTE: This should return an object we'll use to update the document.
|             3. finalCB (REQ): the final callback we'll run after all documents have been updated.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.updatePagesWithCallback=function(options,singleDocUpdateCB,finalCB) {
  var filters = options.filters || {};
  var fields = options.fields || {};
  
  var indErrors = null;
  
  config.mongodb.db.collection("wikicontent").find(filters,fields).each(function(err,doc) {
    if (err) singleDocUpdateCB(err);
    else {
      var updateFields = singleDocUpdateCB(null,doc);
      config.mongodb.db.collection("wikicontent").update({_id:doc._id},updateFields,function(err,result) {
        if (err) {
          indErrors = indErrors || [];
          indErrors.push(err);
        }
      });
    }
  });
  
  finalCB(indErrors);
}

/*-----------------------------------------------------------------------------------------
|NAME:      updateAliases (PUBLIC)
|DESCRIPTION:  Updates page aliases.
|PARAMETERS:  1. options(REQ): options for this method
|                    options.aliases: array of aliases 
|                       ['alias1','alias2',...]
|                    options.Access: instance of AccessManagement
|                    options.username: username of user logged in
|             2. cb(REQ): the callback function once we are done updating the aliases
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.updateAliases=function(options,cb) {
  options = options || {};
  
  var aliases = options.aliases || [];
  var Access = options.Access;
  var username = options.username;
  var self = this;
  
  var aliasesOrig = aliases.map(function(a){return (a[0]=="/") ? a : "/"+a});;
  aliases = aliasesOrig.map(function(a){return {path:a}});
  
  var check = {$or:aliases};
  
  if (aliases.length) {
    async.parallel([
      function(callback) {
        Access.isAdmin({username:username, path:self.path},function(e,isAdmin) {
          callback(e,isAdmin);
        });
      },
      function(callback) {
        self.getPage({filters:check,fields:{path:1,aliasfor:1,_id:0}},function(_e,pages) {
          callback(_e,pages);
        });
      },
      function(callback) {
        self.getPage({filters:{aliasfor:self.path},fields:{path:1,aliasfor:1,_id:0}},function(_e,pages) {
          callback(_e,pages);
        });
      },
      function(callback) {
        try {
          var notAllowed = false;
          async.each(aliasesOrig,function(a,_callback) {
            self.allowedPath(a,function(e,isAllowed) {
              if (e) return _callback(e);
              if (!isAllowed) notAllowed = a;
              _callback(null);
            });
          },
          function(err) {
            callback(err,notAllowed);
          });
          
        } catch(e) {
          callback(e)
        }
        
      }
    ],
      function(err,results) {
        if (err) cb(err)
        else {
          var isAdmin = results[0];
          var alreadyUsed = results[1];
          var currentAliases = results[2];
          var notAllowedPath = results[3];
          
          var currentAliasesOnlyPaths = currentAliases.map(function(c){return c.path});
          var aliasesToDelete = _.difference(currentAliasesOnlyPaths,aliasesOrig).map(function(a){return {path:a}});
          
          if (alreadyUsed.length) {
            aliases = aliases.filter(function(a){return _.findIndex(alreadyUsed,function(used){return a.path == used.path}) == -1});
            alreadyUsed = alreadyUsed.filter(function(a){return typeof a.aliasfor==="undefined" || a.aliasfor != self.path});
          }
          
          if (!isAdmin) cb("You must be a page admin to update the page aliases.");
          else {
            if (notAllowedPath) {
              cb("Your aliases were not saved because the following path is not allowed: " + notAllowedPath);
            } else if (aliases.length || alreadyUsed.length) {
              if (alreadyUsed.length) {
                var inUseString = alreadyUsed.map(function(p){return p.path}).join(", ");
                cb("Your aliases were not saved because the following are already in use: " + inUseString);
              } else {
                var docs = aliases.map(function(a) {
                  a.aliasfor = self.path;
                  a.description = "Page alias for " + self.path;
                  a.updated = new Date();
                  a.updatedBy = {username: username};
                  return a;
                });
                
                config.mongodb.db.collection("wikicontent").insert(docs,function(err,result) {
                  if (err) cb(err);
                  else {
                    //delete aliases we no longer want
                    if (aliasesToDelete.length) {
                      config.mongodb.db.collection("wikicontent").remove({$or:aliasesToDelete},function(e) {
                        cb(e);
                      });
                    } else cb(null)
                  }
                });
              }
            } else {
              if (aliasesToDelete.length) {
                config.mongodb.db.collection("wikicontent").remove({$or:aliasesToDelete},function(e) {
                  cb(e);
                });
              } else cb(null);
            }
          }
        }
      }
    );
  } else {
    //delete all aliases since there are none now
    config.mongodb.db.collection("wikicontent").remove({aliasfor:self.path},function(e) {
      cb(e);
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      getTemplates (PUBLIC)
|DESCRIPTION:  Gets all the active templates in the DB that users can use.
|PARAMETERS:  1. cb(REQ): the callback functions after we get the templates
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getTemplates=function(cb) {
  config.mongodb.db.collection("wikitemplates").find({ active:{$ne:false} }).sort({name:1}).toArray(function(_e,templates) {
    cb(_e,templates);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      searchPages (PUBLIC)
|DESCRIPTION:  Queries for pages based on a user search
|PARAMETERS:  1. query(OPT): text of what a user search for
|             2. cb(REQ): callback function
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.searchPages=function(query,cb) {
  query = query.toLowerCase();
  
  var queryExact = "";
  if (query.indexOf('"') > -1) {
    queryExact = query.replace(/^(.*)(")([^"]+)(")(.*)$/,"$3");
    query = query.replace(/^(.*)(")([^"]+)(")(.*)$/,"$1$5");
  }
  
  var regEx = new RegExp(".*" + query + ".*");
  var querySplit = query.split(" ");
  querySplit.push(query);
  
  //an array of regular expressions to split the entire query up and see if
  //anything matches the END of a path of a page
  //i.e. "customer axiom" would match the path "/something/axiom"
  var regExQuerySplit = [];
  
  _.each(querySplit,function(word) {
    regExQuerySplit.push(new RegExp(".*" + word + "$"/* + ".*"*/));
  });
  
  var returnedFields = {path:1,description:1,tags:1,pageViews:1,updated:1,_id:0};
  
  var filters = {path:/.*/};
  if (query) filters = {$or: [{path:regEx},{tags:{$in:querySplit}},{path:{$in:regExQuerySplit}}]};
  if (queryExact) filters = {$and:[{content_html:new RegExp(".*" + queryExact + ".*","gmi")},filters]};
  
  this.getPage({filters:filters, fields:returnedFields, sort:{pageViews:-1}},function(e,pages) {
    if (e) cb(e);
    else cb(null,pages);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      pageTree (PUBLIC)
|DESCRIPTION:  Gets the page tree given the specfied route/path
|PARAMETERS:  1. path(OPT): an optional path to return sanitized
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.pageTree=function(path) {
  path = path || this.path || "";
  
  var pages=[];
  
  //pages.push({text:'home',link:"/"});
  var splitPages=path.split('/');
  var tempLink="";
  
  for (var _i=0;_i<splitPages.length;_i++) {
    tempLink+="/"+splitPages[_i];
    pages.push({
      text: splitPages[_i],
      link: tempLink
    });
  }
  
  return pages;
}

/*-----------------------------------------------------------------------------------------
|NAME:      requiresReview (PUBLIC)
|DESCRIPTION:  Determines if a path requires review prior to making the content published.
|PARAMETERS:  1. path(OPT): an optional path to return sanitized
|             2. cb(REQ): the callback function to tell us if this requires review. It will return
|                   an integer to tell us how many reviews are required.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.requiresReview=function(path,cb) {
  path = path || this.path;
  this.getPage({filters:{path:path}, fields:{"settings.requiresReview":1}},function(e,pages) {
    if (e) cb(e);
    else if (!pages.length) cb(null,0);
    else {
      var numReviews = pages[0].settings.requiresReview || 0;
      return cb(null,numReviews);
    }
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      allowedPath (PUBLIC)
|DESCRIPTION:  Takes a path provided and determines if it's allowed for a page to have this path.
|PARAMETERS:  1. path(REQ): 
|             2. cb(REQ): the callback to return an error or results of if path is okay
|                     cb(<err>,<boolean: is allowed to use this path>)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.allowedPath=function(path,cb) {
  if (typeof path!=="string") return cb(null,false);
  
  async.waterfall([
    function(callback) {
      config.mongodb.db.collection("adminsettings").find({domid:"forbidden_paths"},{value:1}).toArray(function(_e,paths) {
        if (_e) return callback(_e);
        if (!paths || !paths.length || typeof paths[0] !== "object" || !paths[0].value) return callback(null,true);
        
        var invalid = [];
        paths[0].value.forEach(function(p) {
          invalid.push(new RegExp("^\/" + p + "[\/]*.*$"));
        });
        
        callback(null,invalid);
      });
    },
    function(invalid,callback) {
      callback(null,(_.findIndex(invalid,function(re){return re.test(path)}) > -1) ? false : true);
    }
  ],
    function(err,result) {
      cb(err,result);
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      validatePassword (PUBLIC)
|DESCRIPTION:  Determines if a page is password protected or not
|PARAMETERS:  1. options(OPT): options to pass to the method
|                   options.password: password provided by the user to authenticate with page
|                   options.pagePW: optional password of the page if we've already gotten it from isPasswordProtected
|                   options.session: the session object to save if the user is authenticated
|             2. cb(REQ): the callback to call to return if the user is authenticated with the page
|                     cb(err,<true if user is good/false if not>)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.validatePassword=function(options,cb) {
  var pw = options.password;
  var pagePW = options.pagePW;
  var session = options.session;
  var pageInfo = options.info || null;
  
  var self = this;
  
  var validate = function(actualPW) {
    if (typeof session[self.path]==="object" && session[self.path].auth) {
      cb(null,true);
    } else if (pw == actualPW) {
      session[self.path] = (typeof session[self.path]==="object") ? Object.merge(session[self.path],{auth:true}) : {auth:true};
      session.save();
      cb(null,true);
    } else {
      cb(null,false);
    }
  }
  
  if (pagePW) {
    validate(pagePW);
  } else {
    this.isPasswordProtected(pageInfo,function(e,pw) {
      if (e) cb(e);
      else {
        if (!pw) cb(null,true);
        else validate(pw);
      }
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      isPasswordProtected (PUBLIC)
|DESCRIPTION:  Determines if a page is password protected or not
|PARAMETERS:  1. info(OPT): Either information returned from this.getPage(), or null to use the current path to get info
|             2. cb(REQ): the callback to call to return whether this is PW-protected or not
|                     cb(err,<string for pw, or false if not pw-protected>)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.isPasswordProtected=function(info,cb) {
  var check = function(pageInfo) {
    if (typeof pageInfo.password === "string") cb(null,pageInfo.password);
    else cb(null,false);
  }
  
  if (typeof info==="object" && info!=null) {
    check(info);
  } else {
    this.getPage({fields:{password:1}},function(_e,pageInfo) {
      if (_e) cb(_e);
      else if (!pageInfo.length) cb(null,false);
      else check(pageInfo[0]);
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      event (PUBLIC)
|DESCRIPTION:  Handles getting events of a particular type and executing them.
|PARAMETERS:  1. options(REQ): The type of events we're fetching and running.
|                     options.type: type of event
|                     options.params: object of additional parameters to include.
|             2. cb(REQ): the callback function
|                 cb(err,true/false);
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.event=function(options,cb) {
  options = options || {};
  
  var type = (typeof options==="string") ? options : (options.type || "");
  var params = (typeof options==="string") ? {} : (options.params || {});
  
  var self = this;
  
  if (!type) {
    cb("No type provided");
    return;
  }
  
  async.parallel([
    function(callback) {
      config.mongodb.db.collection("wikicontent").find({path:self.path}).toArray(function(e,doc) {
        if (e) return callback(e);
        if (!doc || !doc.length || !(typeof doc[0] === "object") || !(doc[0].events instanceof Array)) return callback(null,[]);
        
        doc[0].events = doc[0].events.filter(function(ev) {return ev.type == type});
        
        return callback(e,doc);
      });
      
      /* $FILTER IS ONLY SUPPORTED BY MONGODB 3.2+
      config.mongodb.db.collection("wikicontent").aggregate([
        {
          $match: {path:self.path}
        },
        {
          $project: {
            _id: 0,
            events: {
              $filter: {
                input: "$events",
                as: "event",
                cond: {
                  $eq: ["$$event.type",type]
                }
              }
            }
          }
        }
      ],function(e,doc) {
        callback(e,doc);
      });*/
    },
    function(callback) {
      config.mongodb.db.collection("defaultevents").find({type:type}).toArray(function(e,events) {
        callback(e,events);
      });
    },
  ],
    function(err,results) {
      if (err) return cb(err);
      
      var pageEvents = (results[0].length && typeof results[0][0]==="object") ? results[0][0].events : [];
      var defaultEvents = results[1] || [];
      
      var aggregatedEvents = [].concat(pageEvents,defaultEvents);
      
      if (aggregatedEvents.length) {
        var asyncParallel = aggregatedEvents.map(function(event) {
          event = event || {};
          var parameters = Object.merge(params,event.params || {});
          
          return function(callback) {
            var result = new CodeRunner({code:event.code, params:Object.merge({pagepath:self.path},parameters)}).eval();
            
            if (!(result instanceof Error)) callback(null,true);
            else callback(result);
          }
        });
        
        async.parallel(asyncParallel,function(err,results) {
          if (err) cb(err);
          else cb(null,true);
        });
      } else {
        cb(null,true);
      }
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      getExternalDatasources (PUBLIC)
|DESCRIPTION:  Gets available modules from the DB a user can configure as instances on their page(s).
|PARAMETERS:    1. options(OPT): options to include 
|                       options.name
|               2. cb(REQ): the callback function
|                 cb(err,<array/object>:);
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getExternalDatasources=function(options,cb) {
  cb = (typeof options === "function") ? options : cb;
  options = (typeof options === "function") ? {} : (options || {});
  
  var dsName = (typeof options === "string") ? options : (options.name || null);
  
  config.mongodb.db.collection("adminsettings").find({domid:"datasources"}).toArray(function(e,datasources) {
    if (e) return cb(e);
    if (!datasources.length) return cb(null,datasources);
    
    datasources = datasources[0].value;
    
    if (dsName) {
      datasources = datasources.filter(function(ds) {
        return ds.name == dsName;
      })[0];
      
      return cb(null,datasources);
    }
    
    return cb(null,datasources);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      getModules (PUBLIC)
|DESCRIPTION:  Gets available modules from the DB a user can configure as instances on their page(s).
|PARAMETERS:    1. options(OPT): options to include 
|               2. cb(REQ): the callback function
|                 cb(err,true/false);
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getModules=function(options,cb) {
  options = options || {};
  
  var filters = options.filters || { active:{$ne:false} };
  var fields = options.fields || {};
  
  async.parallel([
    function(callback) {
      config.mongodb.db.collection("wiki_modules").find(filters,fields).toArray(function(e,modules) {
        callback(e,modules);
      });
    }
  ],
    function(err,results) {
      var modules = results[0];
      cb(err,modules);
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      getModuleInstances (PUBLIC)
|DESCRIPTION:  Gets all module instances and merges with module info to return back.
|PARAMETERS:  1. path(OPT): path we want to get instances from
|             2. cb(REQ): the callback function
|                 cb(err,true/false);
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getModuleInstances=function(path,cb) {
  path = path || this.path;
  
  var self = this;
  
  async.parallel([
    function(callback) {
      self.getModules({fields:{_id:0, key:1, name:1, description:1, config:1}},function(e,modules) {
        callback(e,modules);
      });
    },
    function(callback) {
      config.mongodb.db.collection("wiki_modules_instances").find({path:path}).toArray(function(e,modulesInstances) {
        callback(e,modulesInstances);
      });
    }
  ],
    function(err,results) {
      if (err) cb(err);
      else {
        var modules = results[0];
        var moduleInstances = results[1];
        
        _.each(moduleInstances,function(instance,_index) {
          var m = modules.filter(function(m) {return m.key == instance.modulekey;}) || [];
          moduleInstances[_index].moduleConfig = (typeof m[0]==="object") ? m[0].config : [];
        });
        
        cb(null,moduleInstances);
      }
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      deletePage (PUBLIC)
|DESCRIPTION:  Deletes a page.
|PARAMETERS:  1. cb(OPT): the callback function to call once finished
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.deletePage=function(cb) {
  var self = this;
  
  async.series([
    function(callback) {
      self.getPage(function(e,page) {
        if (e) callback(e);
        else {
          var oArchive = page[0];
          delete(oArchive["_id"]);
          
          config.mongodb.db.collection("wikicontent_archive").insert(oArchive,function(err,result) {
            callback(err,result);
          });
        }
      });
    },
    function(callback) {
      config.mongodb.db.collection("wikicontent").remove({ $or:[{path:self.path},{aliasfor:self.path}] },function(e,result) {
        callback(e,result);
      });
    },
    function(callback) {
      config.mongodb.db.collection("wiki_modules_instances").remove({ path:self.path },function(e,result) {
        callback(e,result);
      });
    }
  ],
    function(err,results) {
      cb(err);
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      sanitizePath (PUBLIC)
|DESCRIPTION:  Cleans up a path to be used in the DB.
|PARAMETERS:  1. path(OPT): an optional path to return sanitized
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.sanitizePath=function(path) {
  path = (path || this.path || "");
  return this.path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();
}

/*-----------------------------------------------------------------------------------------
|NAME:      escapePath (PUBLIC)
|DESCRIPTION:  Escape the path from this.path
|PARAMETERS:  1. path(OPT): an optional path to return escaped
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.escapePath=function(path) {
  return (path || this.path).replace(/\.\/\+\[\]/g,"\$0");
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=WikiHandler;
}
//-------------------------------------------------------