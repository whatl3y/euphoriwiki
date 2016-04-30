var Authentication = require("./Authentication.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    SocketWikiChat.js
|PURPOSE:  
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  
|REVISION HISTORY:  
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
SocketWikiChat = function(app,socket) {
  this.app = app;
  this.socket = socket;
  
  this.handler = {
    usertyping: userTyping.bind(this)
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      userTyping (PUBLIC)
|DESCRIPTION:  User is typing event
|PARAMETERS:  1. io(REQ): instance of socket.io in the app we can access info for
|             2. socket(REQ): The socket we can emit to, if needed
|             3. data(REQ): the data being returned by the client emit. This is string of what user is typing
|                       {room:room, val:<string of current info>}
|             4. SocketHandler(REQ): instance of SocketHandler we can use to do something
|CALLED FROM:  Nothing
|SIDE EFFECTS: Nothing
|ASSUMES:      Nothing
|RETURNS:      Nothing
-----------------------------------------------------------------------------------------*/
function userTyping(io,socket,data) {
  if (data.val.length>0) {
    socket.broadcast.to(data.room).emit('usertyping',{id:socket.id, typing:true});
  } else {
    socket.broadcast.to(data.room).emit('usertyping',{id:socket.id, typing:false});
  }
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=SocketWikiChat;
}
//-------------------------------------------------------