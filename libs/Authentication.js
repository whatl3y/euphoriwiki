var async = require("async");
var Encryption = require("./Encryption.js");
var Access = require("./AccessManagement.js");
var LDAPHandler = require("./LDAPHandler.js");
var config = require("./config.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    Authentication.js
|PURPOSE:  Makes it easier and more readable to handle socket.io
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  socket.io
|REVISION HISTORY:  
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
Authentication = function(options) {
  options = options || {};
  
  this.session = options.session;        //the session object we will be able to save for future requests
  this.username = this.username();
  
  this.accountsTable = "accounts";
  
  this.encryption = new Encryption();
  this.ldap = new LDAPHandler();
  this.GLOBAL_ADMIN = process.env.GLOBAL_USERNAME;
  this.GLOBAL_PASSWORD = process.env.GLOBAL_PASSWORD;
}

/*-----------------------------------------------------------------------------------------
|NAME:      findOrSaveUser (PUBLIC)
|DESCRIPTION:  Finds and/or saves a username to the DB.
|PARAMETERS:  1. data(REQ): The data we're saving to the record
|            2. cb(REQ): callback function with information
|                 cb(<err>,<object/false>)
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.findOrSaveUser = function(data,cb) {
  var data = data || {};
  var username = (data.$set) ? data.$set.username : data.username;
  var upsert = data.upsert || false;
  var update = data.update || false;
  
  delete(data.upsert);
  delete(data.update);
  
  async.series([
    function(callback) {
      config.mongodb.db.collection("accounts").find({username:username}).toArray(function(e,record) {
          if (e) callback(e);
          else callback(null,(record instanceof Array) ? record[0]: record);
        }
      );
    },
    function(callback) {
      if (update || upsert) {
        config.mongodb.db.collection("accounts").update({username:username},data,{upsert:upsert, new:1},
          function(e,doc) {
            return callback(e,(doc instanceof Array) ? doc[0]: doc);
          }
        );
      } else callback(null,false);
    }
  ],
    function(err,results) {
      if (err) return cb(err);
      
      var origRecord = results[0];
      var updatedOrNewRecord = results[1];
      console.log(origRecord,updatedOrNewRecord);
      
      if (upsert || update) return cb(null,updatedOrNewRecord);
      else if (origRecord) return cb(null,origRecord);
      
      return cb(null,false);
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      auth (PUBLIC)
|DESCRIPTION:  Tries to authenticate a user based on a username/password combination.
|PARAMETERS:  1. options(REQ): 
|            options.username
|            options.password
|        2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.auth = function(options,cb) {
  options = options || {};
  
  switch (options.type) {
    case "activedirectory":
      options.username = options.username + ((options.username.indexOf("@") > -1) ? "" : "@" + config.ldap.suffix);
      this.ldap.auth(options,cb);
      break;
      
    default:
      options.username = options.username + ((options.username.indexOf("@") > -1) ? "" : "@" + config.ldap.suffix);
      this.ldap.auth(options,cb);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      validatePassword (PUBLIC)
|DESCRIPTION:  
|PARAMETERS:  1. enteredPassword(REQ): 
|            2. encryptedPassword(REQ): 
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <boolean>: determines if password is valid
-----------------------------------------------------------------------------------------*/
Authentication.prototype.validatePassword = function(enteredPassword,encryptedPassword) {
  return enteredPassword == this.encryption.decrypt(encryptedPassword);
}

/*-----------------------------------------------------------------------------------------
|NAME:      find (PUBLIC)
|DESCRIPTION:  Gets a user's information either in a DB or AD/LDAP store
|PARAMETERS:  1. options(REQ): 
|            options.query: if provided, is a full LDAP query to search AD for, otherwise need options.attribute and options.value populated
|            options.attribute
|            options.value
|        2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.find = function(options,cb) {
  this.ldap.find(options,cb);
}

/*-----------------------------------------------------------------------------------------
|NAME:      getGroupMembershipForUser (PUBLIC)
|DESCRIPTION:  Returns all groups the user specified is a member of.
|PARAMETERS:  1. options(REQ): 
|               options.username: sAMAccountName, UPN, or DN of user
|             2. cb(REQ): callback function to return back whether the user successfully authenticated.
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.getGroupMembershipForUser = function(options,cb) {
  this.ldap.getGroupMembershipForUser(options,cb);
}

/*-----------------------------------------------------------------------------------------
|NAME:      isUserMemberOf (PUBLIC)
|DESCRIPTION:  Determine if a user is a member of a group.
|PARAMETERS:  1. options(REQ): 
|               options.username: sAMAccountName, UPN, or DN of user
|               options.groupName: cn or dn of group
|             2. cb(REQ): callback function to return back whether the user successfully authenticated.
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.isUserMemberOf = function(options,cb) {
  this.ldap.isUserMemberOf(options,cb);
}

/*-----------------------------------------------------------------------------------------
|NAME:      isAuthTypeEnabled (PUBLIC)
|DESCRIPTION:  Gets necessary information about a user and logs them in by saving to the session.
|PARAMETERS:  1. type(REQ): string indicating the auth type to see if it's enabled
|                 should correspond to keys in db.adminsettings.find > value object
|                     local
|                     ldap
|                     facebook
|                     google
|             2. cb(REQ): cb(error,<true/false>
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.isAuthTypeEnabled = function(type,cb) {
  var oFilter = {};
  oFilter["domid"] = "authtypes";
  oFilter["value." + type] = "true";
  
  config.mongodb.db.collection("adminsettings").find(oFilter,{_id:1}).toArray(function(e,isEnabled) {
    if (e) return cb(e);
    
    return cb(null,!!isEnabled.length);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      login (PUBLIC)
|DESCRIPTION:  Gets necessary information about a user and logs them in by saving to the session.
|PARAMETERS:  1. objOrUpn(REQ): userPrincipalName we're going to find, then store information in the session
|             2. cb(REQ): cb(<error/null>)
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.login = function(objOrUpn,cb) {
  objOrUpn = (typeof objOrUpn==="object")
    ? objOrUpn
    : ((typeof objOrUpn === "string")
      ? objOrUpn + ((objOrUpn.indexOf("@") > -1) ? "" : "@" + config.ldap.suffix)
      : objOrUpn);
  
  var self = this;
  
  //does the actual saving to the session
  //and calls the callback function
  var saveInfo = function(userInfo) {
    var userKeys = Object.keys(userInfo);
    for (var _k = 0; _k < userKeys.length; _k++) {
      self.session[userKeys[_k]] = userInfo[userKeys[_k]];
    }
    
    self.session.username = (self.session.username || self.session.sAMAccountName || "").toLowerCase();
    self.session.email = (self.session.email || self.session.mail || "").toLowerCase();
    self.session.firstname = self.session.firstname || self.session.givenName || "";
    self.session.lastname = self.session.lastname || self.session.familyName || self.session.sn || "";
    
    self.session.loggedIn = true;
    
    new Access({db:config.mongodb.db}).isWikiAdmin(self.session.username,function(err,isAdmin) {
      self.session.isFullAdmin = isAdmin || false;
      
      self.session.save();
      return cb(err);
    });
  }
  
  if (objOrUpn == this.GLOBAL_ADMIN) return saveInfo({ADMIN:true, username:this.GLOBAL_ADMIN});
  else if (typeof objOrUpn === "object") return saveInfo(objOrUpn);
  
  this.isAuthTypeEnabled("ldap",function(err,isEnabled) {
    if (err) return cb(err);
    if (!isEnabled) return cb();
    
    self.find({attribute:"userPrincipalName", value:objOrUpn},function(err,info) {
      if (err) return cb(err);
      
      return saveInfo(info.users[0]);
    });
  });  
}

/*-----------------------------------------------------------------------------------------
|NAME:      username (PUBLIC)
|DESCRIPTION:  Determines if a user is logged in and returns the username if so, false otherwise.
|PARAMETERS:    None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string or false>: string if logged in with username, else false
-----------------------------------------------------------------------------------------*/
Authentication.prototype.username = function() {
  return (this.isLoggedIn()) ? this.session.username : false;
}

/*-----------------------------------------------------------------------------------------
|NAME:      getEmail (PUBLIC)
|DESCRIPTION:  Gets an e-mail address from a logged in user
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: string of an e-mail for the logged in user
-----------------------------------------------------------------------------------------*/
Authentication.prototype.getEmail = function() {
  return (this.isLoggedIn()) ? this.session.email : false;
}

/*-----------------------------------------------------------------------------------------
|NAME:      isLoggedIn (PUBLIC)
|DESCRIPTION:  Determines if a user is logged in and returns that in a callback function
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <boolean>: true/false if user is logged in
-----------------------------------------------------------------------------------------*/
Authentication.prototype.isLoggedIn = function() {
  return (typeof this.session!=="undefined") ? !!this.session.loggedIn : false;
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Authentication;
}
//-------------------------------------------------------