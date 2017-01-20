"use strict";

var path = require("path");
var fs = require("fs");
var jade = require("jade");
var html = require("html");
var mammoth = require("mammoth");

/*-----------------------------------------------------------------------------------------
|TITLE:    GetHTML.js
|PURPOSE: Takes files and converts their contents to HTML that has been prettified.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  path, fs, html, jade, mammoth
|REVISION HISTORY:
|      *LJW 2/19/2016 - created
-----------------------------------------------------------------------------------------*/
var GetHTML = function GetHTML(options) {
  options = options || {};

  this.indent = options.indent || 2; //how far the HTML indent spacing should be for enclosed tags on new lines.
  this.path = options.path || ""; //directory path where file resides
  this.filename = options.file || options.filename || "";
  this.fullpath = options.fullpath || ""; //full directory+file path where file resides

  this.initialize();
};

/*-----------------------------------------------------------------------------------------
|NAME:      initialize (PUBLIC)
|DESCRIPTION:  Initializes class members based on what was passed in
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.initialize = function () {
  if (this.fullpath) {
    if (!path.isAbsolute(this.fullpath)) this.fullpath = this.makePath(__dirname + "/" + this.fullpath);
  } else {
    if (!path.isAbsolute(this.path)) this.fullpath = this.makePath(__dirname + "/" + this.path + "/" + this.filename);else this.fullpath = this.makePath(this.path + "/" + this.filename);
  }
};

/*-----------------------------------------------------------------------------------------
|NAME:      html (PUBLIC)
|DESCRIPTION:  Takes HTML and returns it prettified
|PARAMETERS:  1. string(OPT): an optional string of html to prettify
|             2. cb(REQ): the callback that will return an error or converted HTML string.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.html = function (string, cb) {
  cb = typeof string === "function" ? string : cb;

  var self = this;

  if (typeof string === "function") {
    fs.readFile(this.fullpath, { encoding: "utf8" }, function (e, retHtml) {
      if (e) cb(e);else cb(null, self.prettify(retHtml));
    });
  } else cb(null, self.prettify(string || ""));
};

/*-----------------------------------------------------------------------------------------
|NAME:      htm (PUBLIC)
|DESCRIPTION:  Alias for this.html
|PARAMETERS:  1. string(OPT): an optional string of html to prettify
|             2. cb(REQ): the callback that will return an error or converted HTML string.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.htm = function (string, cb) {
  this.html(string, cb);
};

/*-----------------------------------------------------------------------------------------
|NAME:      jade (PUBLIC)
|DESCRIPTION:  Converts a jade template to html;
|PARAMETERS:    1. string(OPT): an optional string of jade to render
|               2. cb(REQ): the callback that will return an error or converted HTML string.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.jade = function (string, cb) {
  cb = typeof string === "function" ? string : cb;
  method = typeof string === "function" ? "renderFile" : "render";
  methodParam = typeof string === "function" ? this.fullpath : string || "";

  try {
    var retHtml = jade[method](methodParam, { basedir: path.join('', 'views') });
    cb(null, this.prettify(retHtml));
  } catch (e) {
    cb(e);
  }
};

/*-----------------------------------------------------------------------------------------
|NAME:      docx (PUBLIC)
|DESCRIPTION:  Converts a Microsoft Word document to HTML.
|PARAMETERS:  1. cb(REQ): the callback that will return an error or converted HTML string.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.docx = function (cb) {
  var self = this;

  mammoth.convertToHtml({ path: this.fullpath }).then(function (result) {
    cb(null, self.prettify(result));
  }).catch(function (err) {
    cb(err);
  });
};

/*-----------------------------------------------------------------------------------------
|NAME:      doc (PUBLIC)
|DESCRIPTION:  Alias for this.docx
|PARAMETERS:  1. cb(REQ): the callback that will return an error or converted HTML string.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.doc = function (cb) {
  this.docx(cb);
};

/*-----------------------------------------------------------------------------------------
|NAME:      prettify (PUBLIC)
|DESCRIPTION:  Takes HTML and makes it pretty using html module.
|PARAMETERS:  1. htmlString(REQ): the html we're prettifying.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: new prettified HTML string
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.prettify = function (htmlString) {
  try {
    var newHtml = html.prettyPrint(htmlString || "", { indent_size: this.indent });
    return newHtml;
  } catch (e) {
    console.log(e);
    return false;
  }
};

/*-----------------------------------------------------------------------------------------
|NAME:      normalFileToHtml (PUBLIC)
|DESCRIPTION:  Converts plain text (with \r\n, \n, \t, etc) to use HTML
|PARAMETERS:  1. string(REQ): the name of a file
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: extension as a string
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.normalStringToHtml = function (string) {
  return string.replace(/(\r\n|\n|\r)/gm, '<br />').replace(/\t/gm, "&nbsp;&nbsp;").replace(/\s\s/gm, "&nbsp;&nbsp;");
};

/*-----------------------------------------------------------------------------------------
|NAME:      extension (PUBLIC)
|DESCRIPTION:  Gets and returns the file extension
|PARAMETERS:  1. file(REQ): the name of a file
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: extension as a string
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.extension = function (file) {
  return path.extname(file);
};

/*-----------------------------------------------------------------------------------------
|NAME:      makePath (PUBLIC)
|DESCRIPTION:  Makes a path of a file based on the OS.
|PARAMETERS:  1. p(REQ): the path we're converting
|             2. ary(OPT): an array to pass in for recursively building the path
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: new file path
-----------------------------------------------------------------------------------------*/
GetHTML.prototype.makePath = function (p, ary) {
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

module.exports = GetHTML;