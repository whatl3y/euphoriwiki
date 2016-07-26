/*-----------------------------------------------------------------------------------------
|TITLE:    Array_prototypes.js
|PURPOSE:  This will contain functions of the Array object that will be commonly used.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|
|ASSUMES:  Nothing
|REVISION HISTORY:
|      *LJW 7/26/2016 - created
-----------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------
|NAME:      paginate (PUBLIC)
|DESCRIPTION:  Finds the size/length of a JS object.
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    object with paginated array and pagination information
|             {data:[], number_of_pages:##, current_page:##, data_length:##}
-----------------------------------------------------------------------------------------*/
Array.paginate = function(ary,perPage,pageNumber) {
  perPage = perPage || 9999999;
  pageNumber = pageNumber || 1;
  var start = perPage * (pageNumber-1);

  if (ary instanceof Array) {
    var size = ary.length;
    return {
      data: ary.slice(start,start+perPage),
      number_of_pages: Math.ceil(size/perPage),
      current_page: pageNumber,
      data_length: size
    };
  } else if (typeof ary === "object" && ary != null) {
    var obj = ary;
    var keys = Object.keys(obj).sort();
    var size = keys.length;
    var filteredKeys = keys.slice(start,start+perPage);
    var filteredObj = {};
    for (var _i=0; _i<filteredKeys.length; _i++) {
      filteredObj[filteredKeys[_i]] = obj[filteredKeys[_i]];
    }

    return {
      data: filteredObj,
      number_of_pages: Math.ceil(size/perPage),
      current_page: pageNumber,
      data_length: size
    };
  }

  return ary;
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Array;
}
//-------------------------------------------------------
