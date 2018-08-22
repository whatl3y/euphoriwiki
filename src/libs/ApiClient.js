import http from "http"
import https from "https"
import config from "../config.js"

/*-----------------------------------------------------------------------------------------
|TITLE:    ApiClient.js
|PURPOSE:
|AUTHOR:  Lance Whatley
|CALLABLE METHODS:
|ASSUMES:
|REVISION HISTORY:
|      *LJW 12/26/2015 - created
-----------------------------------------------------------------------------------------*/
function ApiClient(opts) {
  opts=opts || {};

  this.endpoint = opts.endpoint || null;
  this.verb = opts.verb || "GET";
  this.port = opts.port || ((opts.secure) ? 443 : 80);
  this.clientType = (opts.secure) ? "https" : "http";
  this.headers = opts.headers || {};

  this.dummyObject = {};
  this.dummyObject.http = http;
  this.dummyObject.https = https;
}

/*-----------------------------------------------------------------------------------------
|NAME:      request (PUBLIC)
|DESCRIPTION:  Makes an HTTP/HTTPS request based on the settings provided
|PARAMETERS:  1. obj(OPT): callback function after we get response
|        2. type(OPT): verb type for an API client
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: If a GET request, a serialized string
|        false: error getting token
-----------------------------------------------------------------------------------------*/
ApiClient.prototype.request = function(reqData,cb) {
  reqData = reqData || {};
  reqData = this.params(reqData,this.verb);

  var fullPath = (this.verb.toLowerCase() === 'get') ? this.path + '?' + reqData : this.path;

  var options = {
    hostname: this.endpoint,
    path: fullPath,
    protocol: this.clientType+":",
    port: this.port,
    method: this.verb,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
  if (this.verb==="POST") options.headers["Content-Length"] = reqData.length;
  options.headers = Object.assign(options.headers,this.headers);

  var req = this.dummyObject[this.clientType].request(options,
    function(res) {
      var body="";
      res.on("data",function(chunk) {
        body+=chunk;
      });
      res.on('end',function() {
        if (typeof cb==="function") cb(null,body);
      });
    }
  ).on("error", function(e) {
    cb(e);
  });

  if (this.verb==="POST") req.write(reqData);
  req.end();
}

/*-----------------------------------------------------------------------------------------
|NAME:      params (PUBLIC)
|DESCRIPTION:  Takes
|PARAMETERS:  1. obj(OPT): callback function after we get response
|        2. type(OPT): verb type for an API client
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: If a GET request, a serialized string
|        false: error getting token
-----------------------------------------------------------------------------------------*/
ApiClient.prototype.params = function(obj,type) {
  obj=obj || {};
  type= (typeof type==='string') ? type.toLowerCase() : 'get';

  // 20160805 LW just serialize if object
  return (typeof obj === "string") ? obj : this.serialize(obj);
  // switch(type) {
  //   case 'get':
  //     if (typeof obj === "string") return obj;
  //     return Object.serialize(obj);
  //
  //   case 'post':
  //     if (typeof obj === "string") return obj;    //return Object.unserialize(obj);
  //     return Object.serialize(obj);
  // }

  return '';
}

ApiClient.prototype.serialize = function(obj) {
  var a=[];
  for (var _key in obj) {
    // a.push( encodeURIComponent(_key)+'='+encodeURIComponent(obj[_key]) );
    if (obj[_key] instanceof Array) {
      for (var _i=0;_i<obj[_key].length;_i++) {
        a.push(encodeURIComponent(_key) + '=' + encodeURIComponent(obj[_key][_i]));
      }
    } else {
      a.push(encodeURIComponent(_key) + '=' + encodeURIComponent(obj[_key]));
    }
  }

  return a.join("&");
}

module.exports = ApiClient
export { ApiClient as default }
