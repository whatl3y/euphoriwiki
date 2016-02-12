(function(req,res) {
  var A = new Auth({session:req.session});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var username = req.params.username.toLowerCase();
  var path = (req.params[0].indexOf("favicon.ico") == 0) ? null : "/user/"+username+req.params[0];
  
  A.find({attribute:"sAMAccountName", value:username},function(_e,info) {
    if (_e || !info) {
      res.render("userpage",config.view.send(req,{obj:{
        pageHeader: "We could not find a user with username: "+username,
        firstname: "Unknown",
        lastname: "Unknown"
      },title:path}));
      
      log.info(_e || "Tried to go to /user/" + username + " but couldn't find this user.");
    } else {
      var userInfo = info.users[0];
      var o;
      
      if (A.isLoggedIn() && A.username==userInfo.sAMAccountName.toLowerCase()) {
        o = {
          pageHeader: "Your page!",
          loggedInUsersPage: true,
          firstname: userInfo.givenName,
          lastname: userInfo.sn
        };
      } else {
        o = {
          pageHeader: userInfo.givenName + " " + userInfo.sn + "'s page!",
          loggedInUsersPage: false,
          firstname: userInfo.givenName,
          lastname: userInfo.sn
        };
      }
      
      o.loggedIn = A.isLoggedIn();
      
      res.render("userpage",config.view.send(req,{obj:o,title:path}));
    
      // NOTE: need to move this to class at some point
      // increment the page visits for the page
      if (path) {
        path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();
        config.mongodb.db.collection("wikicontent").update({path:path},{"$inc":{pageViews:1}},function(_e) {
          if (_e) log.error(_e);
          else audit.log({type:"Visit User Page", additional:{path:path}});
        });
      }
    }
  });
})