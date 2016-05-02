var async = require("async");
var Encryption = require("./Encryption.js");
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
|NAME:      passportVerifyCallback (PUBLIC)
|DESCRIPTION:  Tries to authenticate a user based on a username/password combination.
|PARAMETERS:  1. type(REQ): The strategy type we're authenticating with
|        2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <function>: the function to bind to a passport strategy
-----------------------------------------------------------------------------------------*/
Authentication.prototype.passportVerifyCallback = function(type) {
  var self = this;
  
  switch (type) {
    case "local":
      return function(username,password,done) {
        if (username && username == self.GLOBAL_ADMIN) return done(null,((password == self.GLOBAL_PASSWORD) ? true : false));
        
        self.findOrSaveUser({upsert:false, username:username},function(e,userRecord) {
          if (e) return done(e);
          if (!userRecord) return done(null,false);
          
          if (userRecord.password) {
            if (self.validatePassword(password,userRecord.password)) return done(null,username);
            return done(null,false);
          }
          
          return done(null,false);
        });
      }
      
    case "local-ad":
      return function(username,password,done) {
        config.mongodb.db.collection("adminsettings").find({domid:"authtypes"}).toArray(function(e,types) {
          if (e) return done(e);
          if (!types || !types.length) return done(null,false);
          
          var ldapEnabled = (typeof types[0].value.ldap !== "undefined" && (types[0].value.ldap === true || types[0].value.ldap === "true"));
          
          if (ldapEnabled && config.ldap.url) {      //determines if LDAP is enabled in application
            self.auth({type:"activedirectory", username:username, password:password},function(err,authenticated) {
              if (err) return done(err);
              else if (authenticated) return done(null,username);
              else return done(null,false);
            });
          } else return done(null,false);
        });
      }
      
    case "facebook":
      return function(req, accessToken, refreshToken, profile, done) {
        self.session = req.session;
        
        if (typeof profile === "object") {
          var info = {
            username: "fb_" + profile.id,
            firstname: profile.name.givenName,
            lastname: profile.name.familyName,
            email: profile.emails[0].value,
            accessToken: accessToken,
            refreshToken: refreshToken
          };
        } else return done(null,false);
        
        async.waterfall([
          function(callback) {
            self.findOrSaveUser({username:info.username},function(err,user) {
              callback(err,user);
            });
          },
          function(user,callback) {
            if (user) {
              self.login(user,function(_e) {
                callback(_e,user);
              });
            } else callback(null,false);
          },
          function(userRecord,callback) {
            if (!userRecord) {
              var saveData = {
                type: "facebook",
                created: new Date(),
                lastlogin: new Date(),
                username: info.username,
                firstname: info.firstname,
                lastname: info.lastname,
                email: info.email || null,
                accessToken: info.accessToken,
                refreshToken: info.refreshToken
              };
              
              self.findOrSaveUser(Object.merge(saveData,{upsert:true}),function(e,doc) {
                if (e) {
                  callback(e);
                } else {
                  console.log(doc);
                  self.login(doc,function(_e) {
                    callback(_e,doc);
                  });
                }
                
                new WikiHandler().event({type:"login", params:{username:info.username}},function(e,result) {if (e) log.error(e);});
                audit.log({type:"Login", user:info.username});
              });
            } else callback(null,userRecord);
          }
        ],
          function(err,userRecord) {
            if (err) {
              log.error(err);
              return done(err);
            } else {
              return done(null,info.username);
            }
          }
        );
      }
    
    default:
      return this.passportVerifyCallback("local");
  }
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
        config.mongodb.db.collection("accounts").update({username:username},data,{ upsert:upsert },
          function(e,doc) {
            if (e) callback(e);
            else callback(null,(doc instanceof Array) ? doc[0]: doc);
          }
        );
      } else callback(null,false);
    }
  ],
    function(err,results) {
      if (err) cb(err);
      else {
        var origRecord = results[0];
        var updatedOrNewRecord = results[1];
        
        if (origRecord && upsert) cb(null,updatedOrNewRecord);
        else if (origRecord) cb(null,origRecord);
        else cb(null,(origRecord instanceof Array) ? origRecord : false);
      }
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
      
    /*case "basic":
      this.passportVerifyCallback("local")(options.username,options.password,cb);
      
      break;*/
      
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
|NAME:      login (PUBLIC)
|DESCRIPTION:  Gets necessary information about a user and logs them in by saving to the session.
|PARAMETERS:  1. objOrUpn(REQ): userPrincipalName we're going to find, then store information in the session
|             2. cb(REQ): 
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.login = function(objOrUpn,cb) {
  objOrUpn = (typeof objOrUpn==="object") ? objOrUpn : objOrUpn + ((objOrUpn.indexOf("@") > -1) ? "" : "@" + config.ldap.suffix);
  
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
    self.session.save();
    cb(null);
  }
  
  if (objOrUpn == this.GLOBAL_ADMIN) {
    self.session.ADMIN = true;
    self.session.username = this.GLOBAL_ADMIN;
    self.session.sAMAccountName = this.GLOBAL_ADMIN;
    
    self.session.loggedIn = true;
    self.session.save();
    cb(null);
  } else if (typeof objOrUpn === "object") {
    saveInfo(objOrUpn);
  } else {
    this.find({attribute:"userPrincipalName", value:objOrUpn},function(err,info) {
      if (err) cb(err);
      else {
        //assuming the first user is the one we want
        saveInfo(info.users[0]);
      }
    });
  }
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