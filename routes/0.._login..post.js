(function(req,res) {
  var info = req.body;
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  if (!(info.username && info.password)) {
    res.json({success:false, error:"Please provide both a username and password to log in."});
  } else {
    var loginUsername = info.username + ((info.username.indexOf("@") > -1) ? "" : "@" + config.ldap.suffix);
    
    var A = new Auth({session:req.session});
    
    async.waterfall([
      function(callback) {
        A.findOrSaveUser({username:info.username},function(e,doc) {
          if (e) callback(e);
          else callback(null,doc.type || null);
        });
      },
      function(usertype,callback) {
        A.auth({type:usertype, username:info.username, password:info.password},function(err,authenticated) {
          callback(err,authenticated);
        });
      }
    ],
      function(err,authenticated) {
        if (err) {
          res.json({success:false, error:"There was an issue trying to log you in. Please make sure your username and password are correct, then try again."});
          log.error(err);
        } else if (!authenticated) {
          res.json({success:false, error:"Bad username/password combination. Please try again."});
        } else {
          //save in DB and save in session
          async.parallel([
            function(callback) {
              A.login(info.username,function(_e) {
                callback(_e);
              });
            },
            function(callback) {
              A.find({attribute:"userPrincipalName", value:loginUsername},function(err,info) {
                callback(err,info);
              });
            },
            function(callback) {
              A.findOrSaveUser({upsert:false, username:info.username},callback);
            }
          ],
            function(err,results) {
              if (err) res.json({success:false, error:err});
              else {
                var userInfo = (info.username == A.GLOBAL_ADMIN) ? {username:info.username} : results[1].users[0];
                var userExists = results[2] || false;
                
                var saveData;
                if (userExists) {
                  saveData = {
                    $set: {
                      lastlogin: new Date(),
                      username: info.username,
                      sAMAccountName: userInfo.sAMAccountName,
                      distinguishedName: userInfo.dn,
                      email: userInfo.mail
                    }
                  }
                } else {
                  saveData = {
                    type: "activedirectory",
                    created: new Date(),
                    lastlogin: new Date(),
                    username: info.username,
                    sAMAccountName: userInfo.sAMAccountName,
                    distinguishedName: userInfo.dn,
                    email: userInfo.mail
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
      }
    );
  }
})