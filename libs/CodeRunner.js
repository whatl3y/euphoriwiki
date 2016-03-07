

/*-----------------------------------------------------------------------------------------
|TITLE:    CodeRunner.js
|PURPOSE: Will execute code from a string.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  path, fs, html, jade, mammoth
|REVISION HISTORY:  
|      *LJW 2/21/2016 - created
-----------------------------------------------------------------------------------------*/
CodeRunner = function(options) {
  options = options || {};
  
  this.codestring = (typeof options==="string") ? options : (options.code || "");
  
  if (typeof options==="object" && options.params) {
    this.params = {};
    
    for (var _k in options.params) {
      this.params[_k] = options.params[_k];
    }
  }
  
}

/*-----------------------------------------------------------------------------------------
|NAME:      eval (PUBLIC)
|DESCRIPTION:  Executes a string of JavaScript and returns the results. PARAMS will be an optional object
|            that the eval'ed code can access.
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <result or undefined (if nothing returned)/Error>: true if executed successfully, Error with error otherwise
-----------------------------------------------------------------------------------------*/
CodeRunner.prototype.eval = function() {
  if (typeof this.params==="object") {
    var PARAMS = {};
    
    for (var _k in this.params) {
      PARAMS[_k] = this.params[_k];
    }
  }
  
  try {
    var result = eval(this.codestring);
    return result;
  } catch(err) {
    return err;
  }
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=CodeRunner;
}
//-------------------------------------------------------