/*-----------------------------------------------------------------------------------------
|TITLE:    Core.SocketHandler.js
|PURPOSE:
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|
|ASSUMES:  1. client socket.io library (see this.socket in constructor)
|REVISION HISTORY:
|      *LJW 3/1/2015 - created
-----------------------------------------------------------------------------------------*/
Core.SocketHandler = function(opts) {
  opts=opts || {};

  this.$scope=opts.$scope || {};
  this.wshost=opts.wshost || '//localhost';
  this.namespace=opts.namespace || '/';
  this.socket=opts.socket || io(this.wshost+this.namespace);
  this.room=opts.room || 'DEFAULTROOM';
  this.listeners = opts.events;

  var self=this;
  this.socket.on('connect_error', function(err) {
    console.log("Socket disconnected...", err)
    self.$scope.$apply(function() {
      self.$scope.error='You got disconnected!'
    });
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      initialize (PUBLIC)
|DESCRIPTION:
|PARAMETERS:
|SIDE EFFECTS:  None
|CALLED FROM:
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Core.SocketHandler.prototype.initialize = function() {
  var self=this;
  this.addSocketListeners(this.listeners);
}

/*-----------------------------------------------------------------------------------------
|NAME:      addSocketListeners (PUBLIC)
|DESCRIPTION:  Takes an object or array and will bind an event listener to the socket.
|PARAMETERS:  1. events(REQ): either a JS object, or array of objects that describe the
|              type of event we want to listen for.
|              events[_i].Name: string for the listener type
|              events[_i].Handler: handler for this particular event [function(data){}]
|SIDE EFFECTS:  None
|CALLED FROM:
|ASSUMES:    jQuery
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Core.SocketHandler.prototype.addSocketListeners = function(events) {
  var self=this;
  var go=function(type,handler) {self.socket.on(type,handler);}
  var createHandler = function(hand) {
    try {
      return (typeof hand === "string") ? eval(hand) : hand;
    } catch(err) {
      return err;
    }
  }

  try {
    if (typeof events.length !== 'undefined') {    //events was passed in as array, so loop over
      for (var _i=0;_i<events.length;_i++) {
        go(events[_i].Name,createHandler(events[_i].Handler));
      }
    } else if (typeof events==='object') {      //events was passed in as object
      go(events.Name,createHandler(events.Handler));
    } else {
      throw new Error('Events needs to either be an object or array.');
    }
  } catch(err) {
    console.log(err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      error (PUBLIC)
|DESCRIPTION:  Will bind an error to the scope object for AngularJS
|PARAMETERS:  1. err(REQ): the error we want to bind
|SIDE EFFECTS:  None
|CALLED FROM:
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Core.SocketHandler.prototype.error = function(err) {
  var self = this;
  self.$scope.$apply(function() {
    self.$scope.global.error = err;
  });
}
