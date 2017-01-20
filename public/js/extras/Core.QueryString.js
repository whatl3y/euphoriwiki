/*-----------------------------------------------------------------------------------------
|TITLE:    Core.QueryString.js
|PURPOSE:  This will handle processing anything from the query string and outputting it to
|      the user.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      keyinQueryString
|ASSUMES:  Nothing
|REVISION HISTORY:
|      *LJW 11/17/2014 - created
|      *LJW 12/1/2014 - added to Core namespace
-----------------------------------------------------------------------------------------*/
Core.QueryString = function(params) {
  params=params || {};

  this.key=params.key || params || '';
}

/*-----------------------------------------------------------------------------------------
|NAME:      keyInQueryString (PUBLIC)
|DESCRIPTION:  Given a parameter to look for, check for a value in the query string and
|        do something to it if wanted (either return the value or call a function)
|PARAMETERS:  1.params(OPT): JS object of things we want to use to determine what to do
|            params.callback(OPT): The callback function we're executing if we find a key/value
|                pair, passing in the key/value pair in an object
|            params.retValue(OPT): If we want to simply return the value of the
|                key if it exists, pass this in as true (this will not call CB)
|SIDE EFFECTS:  Nothing
|CALLED FROM:  SquaresHome.boardidInQueryString()
|ASSUMES:    Nothing
|RETURNS:    <value>:the value of the key in the querystring
|        false: unsuccessful or no key was passed in that matches this.key
-----------------------------------------------------------------------------------------*/
Core.QueryString.prototype.keyInQueryString = function(params) {
  params=params || {};
  params={
      callback:  params.callback || false,
      retValue:  params.retValue || false
    };

  var value=false;

  if (typeof this.key!=='string' || this.key==='') {
    return false;
  } else if (window.location.search.length>0) {            //there is something in the query string, so move forward
    var keyVal=this.keyValue();
    if (keyVal) {
      if (params.retValue) {
        return keyVal;
      }
    } else {                            //didn't find a key/value pair
      return false;
    }
  } else {
    return false;
  }

  //If we've come this far, the key existed and we didn't return the value, so see if there's a callback and execute it
  if (typeof params.callback==='function') {
    params.callback({key:this.key,value:keyVal});
  }

  return keyVal;
}

/*-----------------------------------------------------------------------------------------
|NAME:      keyValue (PUBLIC)
|DESCRIPTION:  Given the key we're looking for (this.params.key)
|
|        EXAMPLE: page.html?hello=there&time=000$lance=awesome
|            (this.params.key='time') --> keyValue()='000'
|
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|CALLED FROM:  this.keyInQueryString
|ASSUMES:    Nothing
|RETURNS:    value: found value
|        false: couldn't find value
-----------------------------------------------------------------------------------------*/
Core.QueryString.prototype.keyValue = function() {
  if (!this.key) {return false;}

    var query=window.location.search.substring(1);
    var vars=query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == this.key) {
            return decodeURIComponent(pair[1]);
        }
    }
    return false;
}
