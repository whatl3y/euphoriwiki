(function(req,res) {
  var info = req.body;
  
  if (!(info.username && info.password)) {
    res.json({success:false, error:"Please provide both a username and passowrd to log in."});
  } else {
    info.username += (info.username.indexOf("@") > -1) ? "" : "@pmgnet.dev";
    
    var A = new Auth({session:req.session});
    A.auth({username:info.username, password:info.password},function(err,authenticated) {
      if (err || !authenticated) res.json({success:false, error:"Bad username/password combination. Please try again.", debug:err});
      else {
        //save in session
        A.login(info.username,function(_e) {
          if (_e) res.json({success:false, error:_e});
          else res.json({success:true});
        });
      }
    });
  }
})