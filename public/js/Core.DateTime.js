Core = (typeof Core !== "undefined") ? Core : {};

/*-----------------------------------------------------------------------------------------
|TITLE:    Core.DateTime.js
|PURPOSE:  Displays information about how to contact the site if needed.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      
|ASSUMES:  Nothing
|REVISION HISTORY:  
|      *LJW 11/18/2014 - created
|      *LJW 10/13/2015 - added 'uslong' format type
-----------------------------------------------------------------------------------------*/
Core.DateTime = function(params) {
  params=params || {};                    //define params if no argument is passed in
  if (typeof params==='string') {params={timeZone:params};}  //if the user passes a string into the first parameter, assume it's the timezone
  
  if (typeof params.date!=='undefined') {            //assume if type is object, it's a date object, otherwise it was passed as a string
    if (typeof params.date==='object') {
      this.date=params.date;
    } else {                        //string representing a date (and time)
      if (params.raw) {                  //if it's passed in and true, try and convert date with raw string
        this.date=new Date(params.date);
      } else {
        this.date=this.genericParse(params.date);
      }
    }
  } else {
    this.date=new Date();
  }
  
  this.offset=params.offset || false        //if we want to provide the offset manually, we can define it here
  this.timeZone=params.timeZone || 'GMT';      //the time zone we want any time to get converted to
}

/*-----------------------------------------------------------------------------------------
|NAME:      calculateDateTime (PUBLIC)
|DESCRIPTION:  Used to return the current time on the server. You can use this to show the
|        time that the page was loaded, or use this in a setInterval() call
|        to keep updating the time on the page.
|
|        ASSUMPTION: the date either locally or the one that was provided by the user is
|          in the timezone of the client.
|
|PARAMETERS:  1. format(OPT): the format to return the date/time back. see this.format() for options
|              DEFAULT: take Date() object and just return it with .toString() method
|        2. raw(OPT): typically we will want to parse the date to make sure it's browser independent
|              via this.genericParse. If we want to take a date string and parse it raw via new Date(string),
|              make this parameter true;
|CALLED FROM:  many
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    string with date time in format specified
-----------------------------------------------------------------------------------------*/
Core.DateTime.prototype.calculateDateTime = function(format,raw) {
  var retFunction=this.format(format);                    //the function we'll be running the final Date object through to return to user, based on format provided
  
  if (typeof this.offset==='number') {
    this.offset=this.offset;
  } else if (this.timeZone=='UTC' || this.timeZone=='GMT') {
    this.offset=0;
  } else if (this.timeZone=='EDT') {                      //only support contiguous US timezones and UTC/GMT currently
    this.offset=-4;
  } else if (this.timeZone=='EST' || this.timeZone=='CDT') {
    this.offset=-5;
  } else if (this.timeZone=='CST' || this.timeZone=='MDT') {
    this.offset=-6;
  } else if (this.timeZone=='MST' || this.timeZone=='PDT') {
    this.offset=-7;
  } else if (this.timeZone=='PST') {
    this.offset=-8;
  } else {                                  //we will use the time zone where the user is accessing the browser
    this.timeZone='GMT';
    this.offset=0;
  }
  
  var now=this.date;
  var utcDate=now.getTime()+(now.getTimezoneOffset()*60000);
  var dateString=new Date(utcDate+(3600000*this.offset));
  
  return retFunction(dateString);
}

/*-----------------------------------------------------------------------------------------
|NAME:      convertUTCDateToLocal (PUBLIC)
|DESCRIPTION:  takes a date, assumes it's in UTC, and converts it to Local Time of the client
|PARAMETERS:  1. format(OPT): the format to return the date/time back. see this.format() for options
|              DEFAULT: take Date() object and just return it with .toString() method
|CALLED FROM:  many
|SIDE EFFECTS:  Nothing
|ASSUMES:    this.date was passed as a UTC date
|RETURNS:    String of new, local date
-----------------------------------------------------------------------------------------*/
Core.DateTime.prototype.convertUTCDateToLocal = function(format) {
  var retFunction=this.format(format);
  
  var d=this.date;
  var newDate=new Date(d.getTime()+(d.getTimezoneOffset()*60*1000));
  
  var offset = d.getTimezoneOffset()/60;
  var newHours=d.getHours()-offset;
  var addToDate= (newDate.getHours()-d.getHours()<0) ? -1 : 0;
  
  newDate.setDate(newDate.getDate()+addToDate);
    newDate.setHours(newHours);

    return retFunction(newDate);
}

/*-----------------------------------------------------------------------------------------
|NAME:      human (PUBLIC)
|DESCRIPTION:  Takes a piece of the date (month or day) and returns a human readable string
|        back. 
|            EXAMPLE: type='day' -- 0: Sunday
|                type='month' -- 0: January
|PARAMETERS:  1. string(OPT): Either 'month' or 'day' to convert the date piece to the human
|            readable form. DEFAULT: 'day'
|        2. data(OPT): the piece returned from Date.prototype.getMonth() or .getDay()
|            to return as the human readable form. DEFAULT: 0
|CALLED FROM:  many
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    string representing the piece of the date
-----------------------------------------------------------------------------------------*/
Core.DateTime.prototype.human = function(type,data) {
  data = (data==0 || data) ? data : ((type==='month') ? this.date.getMonth() : this.date.getDay());
  
  var ary=[];
  switch (type) {
    case 'day':
      ary=[
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      ];
      break;
    
    case 'month':
      ary=[
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ];
      break
      
    default:
      return this.human('day',data);
  }
  
  return ary[data];
}

/*-----------------------------------------------------------------------------------------
|NAME:      countdown (PUBLIC)
|DESCRIPTION:  Will calculate the number of days, hours, minutes, and seconds between 2 dates
|          NOTE: assumes both dates provided are in the same time zone
|
|        Use case for this is to call it in a setInterval() function and call it every
|        second to show the difference in time and update information on the client
|
|PARAMETERS:  1. date1(REQ): the first date we're comparing to. This either needs to be a Date()
|            object or a string representing a date/time.
|        2. date2(OPT): the second date we're comparing to, either a Date() object or a string
|            DEFAULT: this will default to new Date() (i.e. current time of client)
|        3. negative(OPT): if this is set to true, we will keep looking at the absolute value of the
|            difference in dates and output the difference if date2 is a date/time AFTER date1.
|            Typically though, date 1 should be a future date and the difference will be date1-date2
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    JS object of info about details of time difference
|        false: failure
-----------------------------------------------------------------------------------------*/
Core.DateTime.prototype.countdown = function(date1,date2,negative) {
  if (typeof date1==='undefined') {      //date1 is required (i.e. this will represent the time in the future in most cases, but doesn't have to)
    return false;
  }
  
  date1= (typeof date1==='string') ? this.genericParse(date1) : date1;
  date2= (typeof date2==='undefined') ? new Date() : (typeof date2==='string') ? this.genericParse(date2) : date2;
  var ret={
    days:    0,
    hours:    0,
    minutes:  0,
    seconds:  0
  };
  
  var dateDif=date1.getTime()-date2.getTime();
  var msDif= (negative) ? Math.abs(dateDif) : dateDif;
  var msDays=(1000*60*60*24);
  var msHours=(1000*60*60);
  var msMinutes=(1000*60);
  var msSeconds=(1000);
  
  if (msDif>0) {                      //if the difference is negative, use the default, which is 0 for all values
    while (msDif>0) {
      if (msDif/msDays>1) {              //days
        ret.days=Math.floor(msDif/msDays);
        msDif-=ret.days*msDays;
        
      } else if (msDif/msHours>1) {          //hours
        ret.hours=Math.floor(msDif/msHours);
        msDif-=ret.hours*msHours;
        
      } else if (msDif/msMinutes>1) {          //minutes
        ret.minutes=Math.floor(msDif/msMinutes);
        msDif-=ret.minutes*msMinutes;
        
      } else if (msDif/msSeconds>1) {          //seconds
        ret.seconds=Math.floor(msDif/msSeconds);
        msDif-=ret.seconds*msSeconds;
        
      } else {
        msDif=0;
      }
    }
  }
  
  return ret;
}

/*-----------------------------------------------------------------------------------------
|NAME:      genericParse (PUBLIC)
|DESCRIPTION:  Parse a string that represents a date and create a new object for it.
|        This should be browser independent and support any browsers that parse dates
|        differently than usual (i.e. iOS browsers)
|PARAMETERS:  1. string(REQ): a string representing a date and/or time
|            ASSUMES the following format, where the delimiter between pieces can change:
|              [year]-[month]-[day] [hours]:[minutes]:[seconds]:[milliseconds]
|CALLED FROM:  many
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    new Date object
|        false: no string provided that is of type string
-----------------------------------------------------------------------------------------*/
Core.DateTime.prototype.genericParse = function(string) {
  if (typeof string!=='string') {return false;}
  
  var arr=string.split(/[- :]/);
    return new Date(arr[0],arr[1]-1,arr[2],arr[3],arr[4],arr[5]);
}

/*-----------------------------------------------------------------------------------------
|NAME:      format (PUBLIC)
|DESCRIPTION:  Taking a Date() object we return a new format of it as a string
|PARAMETERS:  1. format(OPT): the format to return the date/time back
|            OPTIONS INCLUDE:
|                'us':    US locale friendy "MM-DD-YYYY hh:mm:ss" in 24 hour format (00-23)
|                'us12':    same as 'us', but with 12 hour time instead of 24 and with AM or PM attached at the end
|                'mysql':  looks like YYYY-MM-DD hh:mm:ss
|                default:  return date as the function created it (no formatting) except for taking off the time zone at end
|CALLED FROM:  
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    function that defines how the Date should be returned to user
-----------------------------------------------------------------------------------------*/
Core.DateTime.prototype.format = function(format) {
  var self=this;
  var getVal=function(piece) {return (piece.toFixed(0).length==1) ? '0'+piece.toFixed(0) : piece;};
  
  switch (format) {
    case 'us':
      
      return function(dt) {
        return (dt.getMonth()+1)+'-'+dt.getDate()+'-'+dt.getFullYear()+' '+getVal(dt.getHours())+':'+getVal(dt.getMinutes())+':'+getVal(dt.getSeconds());
      };
      
      break;
    
    case 'us12':
      
      return function(dt) {
        var hour;
        var ampm;
        if (dt.getHours()>=12) {
          ampm='PM';
          hour= (dt.getHours()==12) ? 12: dt.getHours()-12;
        } else if (dt.getHours()===0) {
          ampm='AM';
          hour='12';
        } else {
          ampm='AM';
          hour=dt.getHours();
        }
        
        return (dt.getMonth()+1)+'-'+dt.getDate()+'-'+dt.getFullYear()+' '+hour+':'+getVal(dt.getMinutes())+':'+getVal(dt.getSeconds())+' '+ampm;
      };
      
      break;
      
    case 'uslong':
      return function(dt) {
        var getVal=function(piece) {return (piece.toFixed(0).length==1) ? '0'+piece.toFixed(0) : piece;};
        var hours12=function(hour) {
          var num,ampm;
          
          if (hour>=12) {
            ampm='PM';
            num= (hour==12) ? 12 : hour-12;
          } else if (hour===0) {
            ampm='AM';
            num='12';
          } else {
            ampm='AM';
            num=hour;
          }
          
          return {
            num: num,
            ampm: ampm
          };
        }
        
        return self.human('day',dt.getDay())+' '+self.human('month',dt.getMonth())+' '+dt.getDate()+', '+dt.getFullYear()+' '+hours12(dt.getHours()).num+':'+getVal(dt.getMinutes())+' '+hours12(dt.getHours()).ampm;
      }
      
      break;
    
    case 'mysql':
      
      return function(dt) {
        return dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate()+' '+getVal(dt.getHours())+':'+getVal(dt.getMinutes())+':'+getVal(dt.getSeconds());
      };
      
      break;
    
    case 'date':
      
      return function(dt) {
        var dtString=dt.toString();
        return dtString.substr(0,dtString.regexIndexOf(/\s\d+:/));    //see String_prototypes.js for regexIndexOf()
      };
      
      break;
      
    default:
      return function(dt) {
        //looks like: "Tue Nov 18 2014 10:20:17 GMT-0500 (Eastern Standard Time)"
        //need to take off (Eastern Standard Time) since isn't necessarily the case
        var dtString=dt.toString();
        return dtString.substr(0,dtString.indexOf(' GMT'));
      }
      
  }
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Core.DateTime;
}
//-------------------------------------------------------