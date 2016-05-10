/*-----------------------------------------------------------------------------------------
|TITLE:    Object_prototypes.js
|PURPOSE:  This will contain functions of the Object object that will be commonly used.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      
|ASSUMES:  Nothing
|REVISION HISTORY:  
|      *LJW 12/31/2014 - created
-----------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------
|NAME:      size (PUBLIC)
|DESCRIPTION:  Finds the size/length of a JS object.
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    number representing size of object
-----------------------------------------------------------------------------------------*/
Object.size = function(obj) {
  var size = 0;
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        size++;
      }
    }
    return size;
}

/*-----------------------------------------------------------------------------------------
|NAME:      serialize (PUBLIC)
|DESCRIPTION:  Takes a JS object and converts it to a serialized string to be appended to a URL.
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    <string>
-----------------------------------------------------------------------------------------*/
Object.serialize = function(obj) {
  var a=[];
  for (var _key in obj) {
    a.push( encodeURIComponent(_key)+'='+encodeURIComponent(obj[_key]) );
  }
  
  return a.join("&");
}

/*-----------------------------------------------------------------------------------------
|NAME:      unserialize (PUBLIC)
|DESCRIPTION:  Takes a string and converts it to a JS object by separating all parts of a query string
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    <obj>
-----------------------------------------------------------------------------------------*/
Object.unserialize = function(string) {
  string=(/^\?/.test(string)) ? string.substring(1) : string;    //if first char is a question mark, remove it from the string
  
  var a=string.split("&");
  var obj={};
  for (var _i=0;_i<a.length;_i++) {
    var _a = a[_i].split("=");
    obj[ decodeURIComponent(_a[0]) ] = decodeURIComponent(_a[1]);
  }
  
  return obj;
}

/*-----------------------------------------------------------------------------------------
|NAME:      merge (PUBLIC)
|DESCRIPTION:  Takes the base object and an object in the first parameter and "merges" the
|        properties together from the first one. If the second argument is not provided
|        will make a shallow copy of the object in the first argument
|PARAMETERS:  1. obj(REQ): the object we want to merge to properties of the base object with
|SIDE EFFECTS:  Adds to the properties of an Object
|
|        NOTE: if the 'obj2' parameter has a property that is the same property as the base
|        property, this function will override the original object's property with the new one.
|
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    a JS Object
-----------------------------------------------------------------------------------------*/
Object.merge = function(obj1,obj2,obj3) {
  var obj3=obj3 || {};
  var isObject = function(obj,attr) {
    var toClass = {}.toString;
    return typeof obj[attrname]==="object" && toClass.call(obj[attrname]) == "[object Object]";
  }
  
  if (typeof obj1!=='object') {
    //do nothing
  } else if (typeof obj2!=='object') {
    for (var attrname in obj1) {
      if (isObject(obj1,attrname)) obj3[attrname] = Object.merge(obj1[attrname],null,obj3[attrname]);
      else obj3[attrname] = obj1[attrname];
    }
  } else {
    for (var attrname in obj1) {
      if (isObject(obj1,attrname)) obj3[attrname] = Object.merge(obj1[attrname],null,obj3[attrname]);
      else obj3[attrname] = obj1[attrname];
    }
    for (var attrname in obj2) {
      if (isObject(obj2,attrname)) obj3[attrname] = Object.merge(obj2[attrname],null,obj3[attrname]);
      else obj3[attrname] = obj2[attrname];
    }
  }
  
  return obj3;
}

/*-----------------------------------------------------------------------------------------
|NAME:      reKey (PUBLIC)
|DESCRIPTION:  Takes an object and a mapping object and replaces the keys in the object
|        with those in the new mapping.
|PARAMETERS:  1. obj(REQ): the object we want to update the keys for
|        2. oldToNew(OPT): a JS object with the new keys we want to update the object with.
|            If it isn't provided, will return a new array with the values from the
|            previous object. Format of object if passed in will be:
|              obj[ <oldkey> ]=<newKey>
|              NOTE: if <oldkey>==<newkey>, we leave that particular key/value pair alone
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    <obj>: a JS Object with new keys based on the oldToNew mapping
|        <ary>: a new Array created if oldToNew isn't provided
-----------------------------------------------------------------------------------------*/
Object.reKey = function(obj,oldToNew) {
  var newObj;  
  switch (typeof oldToNew) {
    case 'object':
      newObj=Object.merge(obj);    //see function above
      for (var _key in obj) {
        if (typeof oldToNew[ _key ]!=='undefined') {
          newObj[oldToNew[ _key ]]=newObj[ _key ];
          if (_key!=oldToNew[ _key ]) delete( newObj[ _key ]);
        }
      }
      break;
      
    default:
      newObj=[];
      for (var _key in obj) {
        newObj.push(obj[ _key ]);
      }
  }
  
  return newObj;
}

/*-----------------------------------------------------------------------------------------
|NAME:      removeDollarKeys (PUBLIC)
|DESCRIPTION:  Some DBs and other things don't like objects with keys that start with dollar signs
|        ($), so this will remove those since they're typically added by frameworks like AngularJS.
|PARAMETERS:  1. obj(REQ): the object we're removing dollar keys from
|SIDE EFFECTS:  Nothing|
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    the updated JS Object, or original data
-----------------------------------------------------------------------------------------*/
Object.removeDollarKeys = function(obj) {
  if (typeof obj==="object" && obj!=null) {
    for (var _k in obj) {
      if (_k.indexOf("$") == 0) delete(obj[_k]);
      else if (typeof obj[_k]==="object" && obj[_k]!=null) obj[_k]=Object.removeDollarKeys(obj[_k]);
    }
  }
  
  return obj;
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Object;
}
//-------------------------------------------------------