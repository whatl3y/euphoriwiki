(function(req,res) {
  var info = req.body;
  var A = new Auth({session:req.session});
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  switch(info.type) {
    case "loginLocal":
      async.waterfall([
        function(callback) {
          passport.authenticate("local", function(err,user,passportInfo) {
            if (err) return callback(err);
            return callback(null,user);
          })(req, res);
        },
        function(user,callback) {
          if (user) return callback();
          
          passport.authenticate("local-ad", function(err,user,passportInfo) {
            if (err) return callback(err);
            if (!user) return callback(new Error("LDAP is not enabled in the wiki."));
            
            callback();
          })(req, res);
        },
        function(callback) {
          A.findOrSaveUser({username:info.username},function(err,user) {
            callback(err,user);
          });
        },
        function(user,callback) {
          if (user) {
            A.login(user,function(_e) {
              callback(_e,user);
            });
          } else callback(null,false);
        },
        function(userRecord,callback) {
          if (!userRecord) {
            var loginUsername = info.username + ((info.username.indexOf("@") > -1) ? "" : "@" + config.ldap.suffix);
            A.find({attribute:"userPrincipalName", value:loginUsername},function(err,info) {
              callback(err,info,false);
            });
          } else callback(null,userRecord,true);
        }
      ],
        function(err,userRecord,existsAlready) {
          if (err) {
            if (err instanceof Error) log.error(err);
            return res.json({success:false, error:(err instanceof Error) ? "There was an issue trying to log you in. Please try again or contact your wiki admin if the problem persists." : err});
          }

          var userExists = existsAlready;
          var userInfo = (typeof userRecord=="object" && userRecord.username) 
            ? userRecord
            : ((typeof userRecord==="object" && userRecord.users instanceof Array && userRecord.users.length) 
              ? userRecord.users[0] 
              : {});
          
          var saveData;
          if (userExists) {
            saveData = {
              $set: {
                lastlogin: new Date(),
                username: info.username.toLowerCase(),
                firstname: userInfo.firstname || userInfo.givenName,
                lastname: userInfo.lastname || userInfo.familyName || userInfo.sn,
                sAMAccountName: userInfo.sAMAccountName || null,
                distinguishedName: userInfo.dn || null,
                email: userInfo.mail || null
              }
            }
          } else {
            saveData = {
              type: "activedirectory",
              created: new Date(),
              lastlogin: new Date(),
              username: info.username.toLowerCase(),
              firstname: userInfo.firstname || userInfo.givenName,
              lastname: userInfo.lastname || userInfo.familyName || userInfo.sn,
              sAMAccountName: userInfo.sAMAccountName || null,
              distinguishedName: userInfo.dn || null,
              email: userInfo.mail || null
            };
          }
          
          
          A.findOrSaveUser(Object.merge(saveData,{upsert:true}),function(e,doc) {
            if (e) {
              res.json({success:false, error:e});
              log.error(e);
            } else res.json({success:true});
            
            new WikiHandler().event({type:"login", params:{username:info.username}},function(e,result) {if (e) log.error(e);});
            audit.log({type:"Login", user:info.username});
          });
        }
      );
      
      break;
      
    case "authTypes":
      var authTypes = _.mapObject(config.authtypes,function(val,key) {return (val == "true") ? true : false;});
      res.json({success:true, types:authTypes});
      
      break;
      
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})