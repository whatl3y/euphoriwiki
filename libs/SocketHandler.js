var async = require("async");
var SocketGlobal = require("./SocketGlobal.js");
var SocketWikiChat = require("./SocketWikiChat.js");
var config = require('./config.js');
var log = require("bunyan").createLogger(config.logger.options());

/*-----------------------------------------------------------------------------------------
|TITLE:    SocketHandler.js
|PURPOSE:  Makes it easier and more readable to handle socket.io
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  socket.io
|REVISION HISTORY:  
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
SocketHandler = function(opts) {
  opts=opts || {};
  
  this.app = config.socketio;
  this.app.CACHE = this.app.CACHE || {};
  this.app.CACHE.sockets = this.app.CACHE.sockets || {};
  this.app.CACHE.rooms = this.app.CACHE.rooms || {};
  
  if (typeof opts.io === 'undefined') {
    this.io = opts || require('socket.io')();
  } else {
    this.mainIO = opts.io || require('socket.io')();
    this.io = opts.nsIO || this.mainIO;
    this.namespace = opts.namespace || '/';
    
    this.connectionEvent();
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      connectionEvent (PUBLIC)
|DESCRIPTION:  This will bind event handlers to the socket thats created from socket.io connecting
|        to the client.
|PARAMETERS:  None
|CALLED FROM:  constructor or externally
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
SocketHandler.prototype.connectionEvent = function() {
  try {
    var self = this;
    var socketEvent = function(self,socket,fn) {
      return function(ret) {
        fn(self.io,socket,ret,self);
      }
    }
    
    //connect socket.io and bind events
    this.io.on('connection',function(socket) {
      var eventHandlers = {
        global: new SocketGlobal(self.app, socket),
        chat: new SocketWikiChat(self.app, socket)
      };
      
      for (var _category in eventHandlers) {
        var socketEvents = eventHandlers[_category].handler;
        
        for (var _event in socketEvents) {
          if (typeof socketEvents[_event] === 'string') {
            var h = (socketEvents[_event][0]!="(") ? eval("("+socketEvents[_event]+")") : eval(socketEvents[_event]);
          } else {
            var h = socketEvents[_event];
          }
          socket.on(_event,socketEvent(self,socket,h));
        }
      }
      
    });
  } catch (_err) {
    log.error(_err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      getRoomMembers (PUBLIC)
|DESCRIPTION:  Will get a list of all room members in a namespace/room combo
|PARAMETERS:  1. room(REQ): the room we're looking for members in
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Array of room members
-----------------------------------------------------------------------------------------*/
SocketHandler.prototype.getRoomMembers = function(room) {
  var roomMembers = [];
    var nsp = (typeof this.namespace !== 'string') ? '/' : this.namespace;

    for(var socketID in this.mainIO.nsps[nsp].adapter.rooms[room]) {
      roomMembers.push(socketID);
    }

    return roomMembers;
}

/*-----------------------------------------------------------------------------------------
|NAME:      messageInformation (PUBLIC)
|DESCRIPTION:  Will get a list of all room members in a namespace/room combo
|PARAMETERS:  1. options(REQ): the socket id to add to a room
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <object>: object of message information
-----------------------------------------------------------------------------------------*/
SocketHandler.prototype.messageInformation = function(options) {
  
}

/*-----------------------------------------------------------------------------------------
|NAME:      addToRoom (PUBLIC)
|DESCRIPTION:  Will get a list of all room members in a namespace/room combo
|PARAMETERS:  1. id(REQ): the socket id to add to a room
|             2. room(REQ): the room we're looking for members in
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <true/false>: success or not
-----------------------------------------------------------------------------------------*/
SocketHandler.prototype.addToRoom = function(id,room,session) {
  if (!id || !room) return false;
  
  try {
    this.app.CACHE.sockets[id] = {
      socketId: id,
      room: room,
      user: session.username,
      firstname: session.firstname,
      lastname: session.lastname
    };
    
    this.app.CACHE.rooms[room] = this.app.CACHE.rooms[room] || {};
    this.app.CACHE.rooms[room][id] = true;
    
    return this.app.CACHE.sockets[id];
    
  } catch(err) {
    log.error(err);
    return false;
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      disconnect (PUBLIC)
|DESCRIPTION:  Disconnects a socket from the app
|PARAMETERS:  1. id(REQ): the socket id to add to a room
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <true/false>: success or not
-----------------------------------------------------------------------------------------*/
SocketHandler.prototype.disconnect = function(id) {
  var self = this;
  
  try {
    var socketCache = this.app.CACHE.sockets[id];
    var room = (typeof socketCache === "object" && socketCache.room) ? socketCache.room : false;
    
    if (room) delete(this.app.CACHE.rooms[room][id]);
    delete(this.app.CACHE.sockets[id]);
    
    return room;
    
  } catch(err) {
    log.error(err);
    return false;
  }
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=SocketHandler;
}
//-------------------------------------------------------