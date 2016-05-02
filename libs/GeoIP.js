var httpClient = require("./ApiClient.js");

/*-----------------------------------------------------------------------------------------
|TITLE:		GeoIP.js
|PURPOSE:	Uses freegeoip.net API to take an IP address or hostname and finds it's physical
|			location. Find out more information at freegeoip.net.
|AUTHOR:	Lance Whatley
|CALLABLE METHODS:
|			go: makes a request to the endpoint
|REVISION HISTORY:	
|			*LJW 1/7/2016 - created
-----------------------------------------------------------------------------------------*/
function GeoIP(dataType) {
	this.dataType = dataType || "json";		//json, csv, xml, jsonp
	this.client = new httpClient();
	this.client.endpoint = "freegeoip.net";
}

/*-----------------------------------------------------------------------------------------
|NAME:			setPath (PUBLIC)
|DESCRIPTION:	Sets the path of the geofinder to make the http request
|PARAMETERS:	1. ip(OPT): IP address
|				2. cb(OPT): callback
|SIDE EFFECTS:	Nothing
|ASSUMES:		Nothing
|RETURNS:		<string>: the new path
-----------------------------------------------------------------------------------------*/
GeoIP.prototype.setPath = function(ip) {
	return this.client.path = "/" + this.dataType + "/" + ip;
}

/*-----------------------------------------------------------------------------------------
|NAME:			go (PUBLIC)
|DESCRIPTION:	Executes an http request to the endpoint
|PARAMETERS:	1. ip(OPT): IP address
|				2. cb(OPT): callback function to take data and do something with it
|SIDE EFFECTS:	Nothing
|ASSUMES:		Nothing
|RETURNS:		Nothing
-----------------------------------------------------------------------------------------*/
GeoIP.prototype.go = function(ip,cb) {
	var self = this;
	
	this.setPath(ip);
	this.client.request(null,function(err,data) {
		if (err) cb(err);
		else cb(null,(self.dataType=="json") ? JSON.parse(data) : data);
	});
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
	module.exports=GeoIP;
}
//-------------------------------------------------------