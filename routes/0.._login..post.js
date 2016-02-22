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
        res.json({success:false, error:"There was an issue trying to log you in. Please try again."});
        log.error(err);
      } else if (!authenticated) {
        res.json({success:false, error:"Bad username/password combination. Please try again."});
      } else {
        //save in session
        A.login(loginUsername,function(_e) {
          if (_e) res.json({success:false, error:_e});
          else res.json({success:true});
          
          new WikiHandler().event({type:"login", params:{username:info.username}},function(e,result) {if (e) log.error(e);});
          audit.log({type:"Login", user:info.username});
        });
      }
    });
  }
})