import _ from "underscore"

/*-----------------------------------------------------------------------------------------
|TITLE:    SocketPages.js
|PURPOSE:
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:
|REVISION HISTORY:
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
var SocketPages = function(app,socket) {
  this.app = app;
  this.socket = socket;

  this.handler = {
    subscribe: subscribe.bind(this),
    initEdit: initEdit.bind(this),
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
function subscribe(io,socket,data,SocketHandler) {
  var socketId = socket.id;
  var room = data.room;
  var self = this;

  if (typeof self.app.CACHE.rooms[room] !== "undefined" && typeof self.app.CACHE.rooms[room]["editing"] !== "undefined" && self.app.CACHE.rooms[room]["editing"].filter(function(sid){return socketId != sid}).length) {
    setTimeout(function() {
      socket.emit('wikiPageCtrl_editing',{isEditing:true, who:self.app.CACHE.sockets[self.app.CACHE.rooms[room]["editing"].filter(function(sid){return socketId != sid})[0]]});
    },500);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      initEdit (PUBLIC)
|DESCRIPTION:  Initialize editing a page
|PARAMETERS:  1. io(REQ): instance of socket.io in the app we can access info for
|             2. socket(REQ): The socket we can emit to, if needed
|             3. data(REQ): the data being returned by the client emit. EX: data.room
|             4. SocketHandler(REQ): instance of SocketHandler we can use to do something
|CALLED FROM:  Nothing
|SIDE EFFECTS: Nothing
|ASSUMES:      Nothing
|RETURNS:      Nothing
-----------------------------------------------------------------------------------------*/
function initEdit(io,socket,data,SocketHandler) {
  var socketId = socket.id;
  var room = data.room;
  var editState = data.editState;

  var self = this;

  this.app.CACHE.rooms[room] = this.app.CACHE.rooms[room] || {};
  this.app.CACHE.rooms[room]["editing"] = this.app.CACHE.rooms[room]["editing"] || [];

  if (room) {
    if (!editState) {
      this.app.CACHE.rooms[room]["editing"] = this.app.CACHE.rooms[room]["editing"].filter(function(sid) {
        return socketId != sid;
      });

      if (this.app.CACHE.rooms[room]["editing"].length) {
        var oUsersEditing = _.omit(this.app.CACHE.sockets,function(val,key,o) {
          return !self.app.CACHE.rooms[room]["editing"].filter(function(sid) {return sid == key}).length;
        });

        socket.broadcast.to(room).emit('wikiPageCtrl_editing',{isEditing:true, who:oUsersEditing});

      } else {
        socket.broadcast.to(room).emit('wikiPageCtrl_editing',{isEditing:false});
      }

    } else {
      this.app.CACHE.rooms[room]["editing"].push(socketId);
      socket.broadcast.to(room).emit('wikiPageCtrl_editing',{isEditing:editState, who:this.app.CACHE.sockets[socketId]});
    }
  }
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
  var room = (this.app.CACHE.sockets[socket.id]) ? this.app.CACHE.sockets[socket.id].room : null;

  this.handler.initEdit(io,socket,{editState:false, room:room},SocketHandler);
}

module.exports = SocketPages
