import async from "async"
import bunyan from "bunyan"
import socketIo from "socket.io"
import SocketGlobal from "./SocketGlobal.js"
import SocketWikiChat from "./SocketWikiChat.js"
import SocketPages from "./SocketPages.js"
import GeoIP from "./GeoIP.js"
import DateTime from "../src/public/js/extras/Core.DateTime.js"
import config from "../config.js"

const log = bunyan.createLogger(config.logger.options())

/*-----------------------------------------------------------------------------------------
|TITLE:    SocketHandler.js
|PURPOSE:  Makes it easier and more readable to handle socket.io
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  socket.io
|REVISION HISTORY:
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
var SocketHandler = function(opts) {
  opts=opts || {};

  this.app = config.socketio;
  this.app.CACHE = this.app.CACHE || {};
  this.app.CACHE.sockets = this.app.CACHE.sockets || {};
  this.app.CACHE.rooms = this.app.CACHE.rooms || {};

  if (typeof opts.io === 'undefined') {
    this.io = opts || socketIo();
  } else {
    this.mainIO = opts.io || socketIo();
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
    this.io.on('connection', function(socket) {
      var eventHandlers = {
        chat: new SocketWikiChat(self.app, socket),
        pages: new SocketPages(self.app, socket),
        global: new SocketGlobal(self.app, socket)
      }

      for (var _category in eventHandlers) {
        var socketEvents = eventHandlers[_category].handler

        for (var _event in socketEvents) {
          const h = socketEvents[_event]
          socket.on(_event, socketEvent(self, socket, h))
        }
      }

    })
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
  let roomMembers = []
  for (let socketId in this.app.CACHE.rooms[room]) {
    roomMembers.push(socketId)
  }

  return roomMembers
}

/*-----------------------------------------------------------------------------------------
|NAME:      addToRoom (PUBLIC)
|DESCRIPTION:  Will get a list of all room members in a namespace/room combo
|PARAMETERS:  1. options(REQ): options of info
|                   options.id: socket ID
|                   options.room: room we're adding socket to
|                   options.req: request object
|             1. cb(REQ): callback function with info of socket added
|CALLED FROM:
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <true/false>: success or not
-----------------------------------------------------------------------------------------*/
SocketHandler.prototype.addToRoom = function(options, cb) {
  options = options || {}
  var self = this

  var id      = options.id
  var room    = options.room
  var socket  = options.socket
  var req     = socket.request

  if (!id || !room) return cb("No socket ID or room to add this socket to.")

  var realClientIpAddress = (req.headers['x-forwarded-for'] || req.ip || socket.handshake.address || "").split(',')
  realClientIpAddress = realClientIpAddress[realClientIpAddress.length - 1]
  GeoIP.location(realClientIpAddress)
  .then(function(geoData) {
    geoData = geoData || {}

    self.app.CACHE.sockets[id] = {
      socketId: id,
      date: new Date(),
      room: room,
      user: req.session.username,
      firstname: req.session.firstname,
      lastname: req.session.lastname,

      location: {
        ip: geoData.ip || socket.handshake.address,
        city: geoData.city,
        state: geoData.region_name,
        stateCde: geoData.region_code,
        country: geoData.country_name,
        countryCde: geoData.country_code
      }
    }

    self.app.CACHE.rooms[room] = self.app.CACHE.rooms[room] || {}
    self.app.CACHE.rooms[room][id] = true

    return cb(null, self.app.CACHE.sockets[id])
  })
  .catch(cb)
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
  log.debug("Socket just disconnected: " + id);

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

module.exports = SocketHandler
