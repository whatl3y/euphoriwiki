/*-----------------------------------------------------------------------------------------
|TITLE:    String_prototypes.js
|PURPOSE:  This will contain prototypes of the String object that will be commonly used.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|
|ASSUMES:  Nothing
|REVISION HISTORY:
|      *LJW 11/25/2014 - created
-----------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------
|NAME:      multiple (PUBLIC)
|DESCRIPTION:  This method will replace any existence of the character defined with a multiple of those
|        same characters
|
|PARAMETERS:  1. character(REQ): the character that we're going to be adding multiple times.
|        2. times(OPT): the number of characters we're replacing the original with. For example
|              if times=3, we will replace any existence of the character in the first parameter
|              with 3 of those characters.
|              DEFAULT: 2
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    new string: string we just replaced
|        false: failure or character is not defined
-----------------------------------------------------------------------------------------*/
String.prototype.multiple = function(character,times) {
  if (typeof character!=='string' || character==='') {return false}

  times=times || 2;

  var newChar=character;
  for (var _i=1;_i<times;_i++) {
    newChar+=character;
  }

  var re=new RegExp(character,'g');
  return this.replace(re,newChar);
}

/*-----------------------------------------------------------------------------------------
|NAME:      multiple (PUBLIC)
|DESCRIPTION:  This will take a delimited string of e-mail addresses and replace any perceived
|        delimiters between the e-mail addresses with the value in del.
|        It will then remove the whitespace.
|PARAMETERS:  1. del(OPT): the delimiter or character(s) we want to replace with
|            DEFAULT: comma ','
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    new string: string we just replaced
|        false: failure or character is not defined
-----------------------------------------------------------------------------------------*/
String.prototype.email = function(del) {
  del=del || ',';
  return this.replace(/[^\w\s.!@#$%&*]/gi,del).replace(/[\s]/gi,'');
}

/*-----------------------------------------------------------------------------------------
|NAME:      regexIndexOf (PUBLIC)
|DESCRIPTION:  Same as indexOf(), but utilizing a regex instead of a string literal
|PARAMETERS:  1. regex(OPT):
|        2. startpos(OPT):
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    <int>: position of first occurrence that matches regex
|        -1: didn't find regex match in string
-----------------------------------------------------------------------------------------*/
String.prototype.regexIndexOf = function(regex,startpos) {
  var indexOf = this.substring(startpos || 0).search(regex);
  return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

/*-----------------------------------------------------------------------------------------
|NAME:      sqlPrepare (PUBLIC)
|DESCRIPTION:  Takes a string and escapes all single quotes and wraps it with single quotes
|        if it is not wrapped already.
|PARAMETERS:  None
|CALLED FROM:  many
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>
-----------------------------------------------------------------------------------------*/
String.prototype.sqlPrepare = function() {
  if (this[0] == "'" || this[0] == '"') return this;
  else {
    return "'" + this.replace(/'/gm,"''") + "'";
  }
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = String
}
//-------------------------------------------------------
