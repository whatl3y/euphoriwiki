import bunyan from "bunyan"
import config from "../config.js"

const log = bunyan.createLogger(config.logger.options())

/*-----------------------------------------------------------------------------------------
|TITLE:    SocketGlobal.js
|PURPOSE:
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:
|REVISION HISTORY:
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
var SocketGlobal = function(app, socket) {
  this.app = app
  this.socket = socket

  this.handler = {
    subscribe: subscribe.bind(this),
    disconnect: disconnect.bind(this)
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      subscribe (PUBLIC)
|DESCRIPTION:  Subscribe event
|PARAMETERS:  1. io(REQ): instance of socket.io in the app we can access info for
|             2. socket(REQ): The socket we can emit to, if needed
|             3. data(REQ): the data being returned by the client emit. EX: data.room
|             4. SocketHandler(REQ): instance of SocketHandler we can use to do something
|CALLED FROM:  Nothing
|SIDE EFFECTS: Nothing
|ASSUMES:      Nothing
|RETURNS:      Nothing
-----------------------------------------------------------------------------------------*/
function subscribe(io, socket, data, SocketHandler) {
  var self = this

  SocketHandler.addToRoom({ id: socket.id, room: data.room, socket: socket }, function(err, info) {
    if (err)
      return log.error(err)

    if (info) {
      socket.join(data.room)

      var roomMembersSocketIDs = SocketHandler.getRoomMembers(data.room)
      var roomMembers = roomMembersSocketIDs.map(id => self.app.CACHE.sockets[id])

      socket.broadcast.to(data.room).emit("globalCtrl_subscribe", info)
      socket.emit("globalCtrl_populateclientlist", roomMembers)

      io.to("/admin/visitors").emit("adminVisitorsCtrl_update", self.app.CACHE.sockets)
    }
  })
}

/*-----------------------------------------------------------------------------------------
|NAME:      disconnect (PUBLIC)
|DESCRIPTION:  disconnect event
|PARAMETERS:  1. io(REQ): instance of socket.io in the app we can access info for
|             2. socket(REQ): The socket we can emit to, if needed
|             3. data(REQ):
|             4. SocketHandler(REQ): instance of SocketHandler we can use to do something
|CALLED FROM:  Nothing
|SIDE EFFECTS: Nothing
|ASSUMES:      Nothing
|RETURNS:      Nothing
-----------------------------------------------------------------------------------------*/
function disconnect(io,socket,data,SocketHandler) {
  var room = SocketHandler.disconnect(socket.id);
  if (room) {
    io.to(room).emit("globalCtrl_disconnect",socket.id);
    io.to("/admin/visitors").emit("adminVisitorsCtrl_update",this.app.CACHE.sockets);
  }
}

module.exports = SocketGlobal
export { SocketGlobal as default }
