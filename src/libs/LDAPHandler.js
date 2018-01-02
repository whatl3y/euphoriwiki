import ActiveDirectory from "activedirectory"
import config from "../config.js"

/*-----------------------------------------------------------------------------------------
|TITLE:    LDAPHandler.js
|PURPOSE:  Handles making requests/querying an LDAP implementation
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  socket.io
|REVISION HISTORY:
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
var LDAPHandler = function(options) {
  options = options || {};

  this.config = {
    url: (config.ldap.url) ? (config.ldap.protocol || "ldap")+"://"+config.ldap.url : null,
    baseDN: config.ldap.basedn,
    username: config.ldap.username,
    password: config.ldap.password
  };

  this.ad = (this.config.url) ? new ActiveDirectory(this.config) : null;
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
LDAPHandler.prototype.auth = function(options,cb) {
  options = options || {};

  if (!(options.username && options.password)) {
    cb("Either a username or password was not provided.");
  } else {
    try {
      this.ad.authenticate(options.username,options.password,function(err,auth) {
        cb(err,auth);
      });
    } catch(err) {
      cb(err);
    }
  }
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
LDAPHandler.prototype.find = function(options,cb) {
  options = options || {};

  var query = options.query || "";
  var attribute = options.attribute || "sAMAccountName";
  var value = options.value || "";
  var timeout = options.timeout || 10000;

  if (!query && !value) {
    cb("No value was provided for the " + attribute + " attribute. Please provide a value.");
  } else {
    try {
      if (query) this.ad.find({timeout:timeout, filter:query},cb);
      else this.ad.find({timeout:timeout, filter:attribute + "=" + value},cb);

    } catch(err) {
      cb(err);
    }
  }
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
LDAPHandler.prototype.getGroupMembershipForUser = function(options,cb) {
  options = options || {};

  var username = (typeof options==="string") ? options : (options.username || "");

  if (!(username)) {
    cb("Please provide a username.");
  } else {
    try {
      this.ad.getGroupMembershipForUser(username,cb);
    } catch(err) {
      cb(err);
    }
  }
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
LDAPHandler.prototype.isUserMemberOf = function(options,cb) {
  options = options || {};

  var username = options.username;
  var group = options.groupName || options.group;

  if (!(username && group)) {
    cb("Please provide both a username and group name.");
  } else {
    try {
      this.ad.isUserMemberOf(username,group,cb);
    } catch(err) {
      cb(err);
    }
  }
}

module.exports = LDAPHandler
