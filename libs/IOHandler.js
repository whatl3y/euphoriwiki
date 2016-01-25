var config = require('./config.js');
var log = require("bunyan").createLogger(config.logger.options());

/*-----------------------------------------------------------------------------------------
|TITLE:		IOHandler.js
|PURPOSE:	Makes it easier and more readable to handle socket.io
|AUTHOR:	Lance Whatley
|CALLABLE TAGS:
|ASSUMES:	socket.io
|REVISION HISTORY:	
|			*LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
IOHandler = function(opts) {
	opts=opts || {};
	
	if (typeof opts.io==='undefined') {
		this.io=opts || require('socket.io')();
	} else {
		this.mainIO=opts.io || require('socket.io')();
		this.io=opts.nsIO || this.mainIO;
		this.namespace=opts.namespace || '/';
		this.room=opts.room || 'DEFAULTROOM';				//if no room is specified below
		this.names=opts.names || {};
		this.events=opts.events || [];
		
		this.connectionEvent(this.events);
	}
}

/*-----------------------------------------------------------------------------------------
|NAME:			connectionEvent (PUBLIC)
|DESCRIPTION:	This will bind event handlers to the socket thats created from socket.io connecting
|				to the client.
|PARAMETERS:	1. socketEvents(OPT): This is an array of arrays of events with their respective callback
|							functions. 
|CALLED FROM:	constructor or externally
|SIDE EFFECTS:	Nothing
|ASSUMES:		Nothing
|RETURNS:		Nothing
-----------------------------------------------------------------------------------------*/
IOHandler.prototype.connectionEvent = function(socketEvents) {
	try {
		socketEvents=socketEvents || [];
		var self=this;
		var socketEvent=function(self,socket,fn) {
			return function(ret) {
				fn(self.io,socket,ret,self);
			}
		}
		
		//connect socket.io and bind events
		this.io.on('connection',function(socket) {
			for (var _event in socketEvents) {
				if (typeof socketEvents[_event].Handler === 'string') {
					var handler = (socketEvents[_event].Handler[0]!="(") ? eval("("+socketEvents[_event].Handler+")") : eval(socketEvents[_event].Handler);
				} else {
					var handler = socketEvents[_event].Handler;
				}
				
				socket.on(socketEvents[_event].Name,socketEvent(self,socket,handler));
			}
		});
	} catch (_err) {
		log.error(_err);
	}
}

/*-----------------------------------------------------------------------------------------
|NAME:			getRoomMembers (PUBLIC)
|DESCRIPTION:	Will get a list of all room members in a namespace/room combo
|PARAMETERS:	1. room(OPT): the room we're looking for members in
|CALLED FROM:	
|SIDE EFFECTS:	Nothing
|ASSUMES:		Nothing
|RETURNS:		Array of room members
-----------------------------------------------------------------------------------------*/
IOHandler.prototype.getRoomMembers = function(room) {
	room=room || this.room;
	
	var roomMembers = [];
    var nsp = (typeof this.namespace !== 'string') ? '/' : this.namespace;

    for(var socketID in this.mainIO.nsps[nsp].adapter.rooms[room]) {
        roomMembers.push(socketID);
    }

    return roomMembers;
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
	module.exports=IOHandler;
}
//-------------------------------------------------------