(function(req,res) {
  var info = req.body;
  var A = new Auth({session:req.session});
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  switch(info.type) {
    case "loginLocal":
      passport.authenticate("local", function(err,user,passportInfo) {
        if (err) {
          res.json({success:false, error:"There was a problem trying to log you in. Please try again or contact us if the problem persists."});
          log.error(err);
        } else if (!user) res.json({success:false, error:"We don't recognize this username/password combination. Please try again."});
        else {
          async.waterfall([
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
                res.json({success:false, error:"There was an issue trying to log you in. Please try again or contact your wiki admin if the problem persists."});
                log.error(err);
              } else {
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
            }
          );
        }
      })(req, res);
      
      break;
      
    case "authTypes":
      var authTypes = _.mapObject(config.authtypes,function(val,key) {return (val == "true") ? true : false;});
      res.json({success:true, types:authTypes});
      
      break;
      
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})