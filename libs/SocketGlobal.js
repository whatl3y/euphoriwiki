
/*-----------------------------------------------------------------------------------------
|TITLE:    SocketGlobal.js
|PURPOSE:  
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  
|REVISION HISTORY:  
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
SocketGlobal = function(app,socket) {
  this.app = app;
  this.socket = socket;
  
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
|             3. room(REQ): the data being returned by the client emit. The room
|             4. SocketHandler(REQ): instance of SocketHandler we can use to do something
|CALLED FROM:  Nothing
|SIDE EFFECTS: Nothing
|ASSUMES:      Nothing
|RETURNS:      Nothing
-----------------------------------------------------------------------------------------*/
function subscribe(io,socket,room,SocketHandler) {
  var info = SocketHandler.addToRoom(socket.id,room,socket.request.session);
  
  if (info) {
    socket.join(room);
    io.to(room).emit("globalCtrl_subscribe",info);
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
  var room = SocketHandler.disconnect(socket.id);
  if (room) io.to(room).emit("globalCtrl_disconnect",socket.id);
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=SocketGlobal;
}
//-------------------------------------------------------