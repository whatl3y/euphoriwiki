var config = require('./config.js');

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
  this.getPage({filters:{path:new RegExp("^"+this.escapePath()+"/.+$")},fields:{path:1,description:1,pageViews:1}},function(_e,pages) {
    if (_e) cb(_e);
    else cb(null,pages);
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
|NAME:      searchPages (PUBLIC)
|DESCRIPTION:  Queries for pages based on a user search
|PARAMETERS:  1. query(OPT): text of what a user search for
|             2. cb(REQ): callback function
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>
-----------------------------------------------------------------------------------------*/
WikiHandler.prototype.searchPages=function(query,cb) {
  var regEx = new RegExp(".*" + query + ".*");
  var querySplit = query.split(" ");
  querySplit.push(query);
  
  this.getPage({filters: {$or: [{path:regEx},{tags:{$in:querySplit}}]},fields:{path:1,description:1,tags:1,pageViews:1,updated:1,_id:0},sort:{pageViews:-1}},function(e,pages) {
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