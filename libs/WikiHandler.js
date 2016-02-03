var _ = require("underscore");
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
|NAME:      getSubPages (PUBLIC)
|DESCRIPTION:  Gets all the information about a page.
|PARAMETERS:  1. options(OPT): callback function after we find the pages.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.getSubPages=function(cb) {
  var self=this;
  
  var children = new RegExp("^"+this.escapePath()+"/.+$");      //all nested children
  //var children = new RegExp("^"+this.escapePath()+"/[^/]+$");     //only direct children
  
  this.getPage({filters:{path:children},fields:{path:1,description:1,pageViews:1}},function(_e,pages) {
    if (_e) cb(_e);
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
      
      if (_e) cb(_e);
      else cb(null,oPages);
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
  
  this.getPage({filters: {$or: [{path:regEx},{tags:{$in:querySplit}},{path:{$in:regExQuerySplit}}]},fields:returnedFields,sort:{pageViews:-1}},function(e,pages) {
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
    
    var isValid = true;
    _.each(invalid,function(re) {
      if (re.test(path)) {
        isValid=false;
        return;
      }
    });
    
    return isValid;
  }
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