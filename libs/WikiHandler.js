var _ = require("underscore");
var async = require("async");
var GetHTML = require("./GetHTML.js");
var Mailer = require("./Mailer.js");
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
  
  this.emailtemplatepath = options.templatepath || __dirname + "/../views/emailtemplates";
  
  this.sanitizePath(options.path);
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
  
  var path = (typeof options==="string") ? options : (options.path || this.path);
  var filters = (typeof options==="string") ? {path:path} : (options.filters || {path:path});
  var fields = (typeof options==="string") ? {} : (options.fields || {});
  var sort = (typeof options==="string") ? {} : (options.sort || {});
  
  config.mongodb.db.collection("wikicontent").find(filters,fields).sort(sort).toArray(function(_e,pageInfo) {
    if (_e) cb(_e);
    else cb(null,pageInfo);
  });
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
|NAME:      getTemplates (PUBLIC)
|DESCRIPTION:  Gets all the active templates in the DB that users can use.
|PARAMETERS:  1. cb(REQ): the callback functions after we get the templates
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getTemplates=function(cb) {
  config.mongodb.db.collection("wikitemplates").find({}).sort({name:1}).toArray(function(_e,templates) {
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
|NAME:      createInheritanceFilter (PUBLIC)
|DESCRIPTION:  This will create and return an object that can be included in a mongodb query
|             to look for information within the current path OR any of the parent paths. This is
|             relevant for looking for whether a particular condition exists in the current path
|             or any parents for inheritance
|PARAMETERS:  1. path(OPT): the path we're creating the filter for
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <object>: and $or mongodb filter object to be appended to other filters.
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.createInheritanceFilter=function(path) {
  path = path || "";
  
  var pathAry = path.split("/");
  pathAry.shift();
  
  var pathString = "";
  var oFilter = {$or:[]};
  
  oFilter["$or"] = _.map(pathAry,function(piece) {
    pathString += "/" + piece;
    return {path:pathString};
  });
  
  return oFilter;
}

/*-----------------------------------------------------------------------------------------
|NAME:      allowedPath (PUBLIC)
|DESCRIPTION:  Takes a path provided and determines if it's allowed for a page to have this path.
|PARAMETERS:  1. path(OPT): 
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <boolean>
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.allowedPath=function(path) {
  var invalid = [
    /^\/user$/,
    /^\/user[\/]{1}.*/,
    /^\/admin[\/]*$/,
    /^\/login[\/]*$/,
    /^\/logout[\/]*$/,
    /^\/search[\/]*.*/,
    /^\/file[\/]*.*/
  ];
  
  if (typeof path!=="string") return false;
  else {
    path = (path.indexOf("/") == 0) ? path : "/"+path;
    return (_.findIndex(invalid,function(re){return re.test(path)}) > -1) ? false : true;
  }
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
    this.getPage(function(_e,pageInfo) {
      if (_e) cb(_e);
      else if (!pageInfo.length) cb(null,false);
      else check(pageInfo[0]);
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      emailSubscribers (PUBLIC)
|DESCRIPTION:  Determines if a page is password protected or not
|PARAMETERS:  1. info(OPT): object of information about the e-mail we're sending to subscribers of a page
|             2. cb(REQ): the callback to call to return whether this is PW-protected or not
|                     cb(err,<boolean success>)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.emailSubscribers=function(info,cb) {
  var templateName = info.template;
  var templateKeys = info.keys || {};
  
  var self = this;
  
  async.parallel([
    function(callback) {
      self.getPage({fields:{subscribers:1}},function(e,pageInfo) {
        callback(e,pageInfo);
      });
    },
    function(callback) {
      config.mongodb.db.collection("emailtemplates").find({name:templateName}).toArray(function(e,template) {
        callback(e,template);
      });
    },
  ],
    function(err,results) {
      if (err) cb(err);
      else {
        var pageInfo = results[0];
        var template = results[1];
        
        if (!pageInfo.length) cb(null,false);
        else if (!template.length) cb(null,false);
        else {
          var send = function(body) {
            new Mailer({
              send: true,
              bcc: pageInfo[0].subscribers,
              template: {
                templateInfo: {
                  subject: template[0].subject,
                  html: body
                },
                
                keys: templateKeys,
                
                cb: function(e,info) {
                  cb(e,info);
                }
              }
            });
          };
          
          var gH = new GetHTML({fullpath:self.emailtemplatepath + "/" + template[0].file});
          
          if (template[0].file) {
            var templateExtension = gH.extension(template[0].file);
            
            if (typeof gH[templateExtension.substring(1)]!=="undefined") {
              gH[templateExtension.substring(1)](function(e,h) {
                if (e) cb(e);
                else {
                  var templateHtml = h;
                  send(templateHtml);
                }
              })
            } else {
              cb(null,false);
            }
          } else {
            var templateHtml = template[0].html;
            send(templateHtml);
          }
        }
      }
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
  return this.path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase()
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