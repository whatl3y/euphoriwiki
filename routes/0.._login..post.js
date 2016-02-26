(function(req,res) {
  var info = req.body;
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  if (!(info.username && info.password)) {
    res.json({success:false, error:"Please provide both a username and passowrd to log in."});
  } else {
    var loginUsername = info.username + ((info.username.indexOf("@") > -1) ? "" : "@" + config.ldap.suffix);
    
    var A = new Auth({session:req.session});
    A.auth({username:loginUsername, password:info.password},function(err,authenticated) {
      if (err) {
        res.json({success:false, error:"There was an issue trying to log you in. Please make sure your username and password are correct, then try again."});
        log.error(err);
      } else if (!authenticated) {
        res.json({success:false, error:"Bad username/password combination. Please try again."});
      } else {
        //save in DB and save in session
        async.parallel([
          function(callback) {
            A.login(loginUsername,function(_e) {
              callback(_e);
            });
          },
          function(callback) {
            A.find({attribute:"userPrincipalName", value:loginUsername},function(err,info) {
              callback(err,info);
            });
          }
        ],
          function(err,results) {
            if (err) res.json({success:false, error:err});
            else {
              var userInfo = results[1].users[0];
              
              var saveData = {
                created: new Date(),
                username: info.username,
                sAMAccountName: userInfo.sAMAccountName,
                distinguishedName: userInfo.dn,
                email: userInfo.mail
              };
              
              config.mongodb.db.collection("accounts").findAndModify({username:info.username},[],saveData,{ upsert:true },
                function(e,doc) {
                  if (e) {
                    res.json({success:false, error:e});
                    log.error(e);
                  } else res.json({success:true});
                  
                  new WikiHandler().event({type:"login", params:{username:info.username}},function(e,result) {if (e) log.error(e);});
                  audit.log({type:"Login", user:info.username});
                }
              );
            }
          }
        );
      }
    });
  }
})