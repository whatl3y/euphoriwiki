/*-----------------------------------------------------------------------------------------
|TITLE:    Core.CopyPaste.js
|PURPOSE:  
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      
|ASSUMES:  1. client socket.io library (see this.socket in constructor)
|      2. MessageLinkWidget.js
|REVISION HISTORY:  
|      *LJW 3/16/2015 - created
-----------------------------------------------------------------------------------------*/
Core.CopyPaste = function(opts) {
  opts=opts || {};
  
  this.elements= (opts.elements instanceof jQuery) ? [opts.elements] : (opts.elements || []);    //array of jQuery elements to bind an event handler to
  this.callback = opts.cb || opts.callback;
  
  if (this.check()) {
    this.bindHandlers(this.callback);
  } else {
    this.callback('copy/paste not compatible');
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      bindHandlers (PUBLIC)
|DESCRIPTION:  Binds the paste event handlers to make sure we capture the information
|        as expected in the file reader.
|PARAMETERS:  1. callback
|SIDE EFFECTS:  None
|CALLED FROM:  
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Core.CopyPaste.prototype.bindHandlers = function(callback) {
  var self=this;
  callback = callback || this.callback;
  
  for (var _i=0;_i<this.elements.length;_i++) {
    this.elements[_i].on('paste',function(e) {
      self.paste(e,callback);
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      removeHandlers (PUBLIC)
|DESCRIPTION:  Removes the paste event handlers
|PARAMETERS:  
|SIDE EFFECTS:  None
|CALLED FROM:  
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Core.CopyPaste.prototype.removeHandlers = function() {
  for (var _i=0;_i<this.elements.length;_i++) {
    this.elements[_i].unbind('paste');
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      paste (PUBLIC)
|DESCRIPTION:  binds the paste event handlers to make sure we capture the information
|        as expected in the file reader.
|PARAMETERS:  1. e(REQ): the event object that gets sent when handler fires
|             2. cb(REQ): callback function to do something with the result
|SIDE EFFECTS:  None
|CALLED FROM:  
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Core.CopyPaste.prototype.paste = function(e,cb) {
  if (typeof e.clipboardData!=='undefined' || typeof e.originalEvent.clipboardData!=='undefined') {
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    //console.log(JSON.stringify(items));      // will give you the mime types
    
    if (typeof items==='object' && items.length>0) {
      if (this.blobTypes().indexOf(items[0].type)>-1) {
        var blob = items[0].getAsFile();
        var reader1 = new FileReader();
        //var reader2 = new FileReader();
        
        reader1.onload = function(event){
          cb(null,event.target.result);     //This should append to the src of an img object
        }
        reader1.readAsDataURL(blob);        //will have a file path of the clipboard data, so use this to put into an IMG
        
        
        /*reader2.onload = function(event){
          console.log(event.target.result);    //event.target.result contains the file binary data
        }
        reader2.readAsBinaryString(blob);*/      //reads the binary file of the clipboard data, so use this to upload to the DB
      } else {
        cb("Please make sure you are pasting an image file.");
      }
    }
  } else {
    cb('No clipboard data exists.');
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      check (PUBLIC)
|DESCRIPTION:  Check whether the necessary objects exist within the browser prior to
|        binding any copy/paste event handlers to the elements.
|PARAMETERS:  
|SIDE EFFECTS:  None
|CALLED FROM:  
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Core.CopyPaste.prototype.check = function() {
  return (typeof FileReader!=='undefined');
}

/*-----------------------------------------------------------------------------------------
|NAME:      blobTypes (PUBLIC)
|DESCRIPTION:  Returns an array of supported blob/image types
|PARAMETERS:  None
|SIDE EFFECTS:  None
|CALLED FROM:  
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Core.CopyPaste.prototype.blobTypes = function() {
  return [
    'image/png',
    'image/gif',
    'image/jpg',
    'image/jpeg',
    'image/bmp'
  ];
}