(function(req,res) {
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db: config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var username = (req.params.username || "").toLowerCase();
  var path = (req.params[0].indexOf("favicon.ico") == 0) ? null : "/user/"+username+req.params[0];
  
  async.parallel([
    function(callback) {
      A.find({attribute:"sAMAccountName", value:username},function(_e,info) {
        callback(_e,info);
      });
    },
    function(callback) {
      Access.isAdmin({username:A.username, path:path, editOnly:false},function(e,isAdmin) {
        callback(e,isAdmin);
      });
    },
    function(callback) {
      Access.canViewPage({session:req.session, username:A.username, path:path},function(e,canView) {
        callback(e,canView);
      });
    }
  ],
    function(err,results) {
      if (err) {
        res.render("userpage",config.view.send(req,{obj:{
          pageHeader: "We could not find a user with username: "+username,
          firstname: "Unknown",
          lastname: "Unknown"
        },title:path}));
        
        log.debug(err || "Tried to go to /user/" + username + " but couldn't find this user.");
        
      } else {
        var info = results[0];
        var canViewPage = results[1] || results[2];
        
        if (!canViewPage) res.redirect("/?auth=" + path);
        else {
          if (typeof info==="object" && info.users instanceof Array) {
            var o;
            var userInfo = info.users[0];
            
            if (A.isLoggedIn() && A.username == username) {
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
          } else {
            o = {
              pageHeader: "Unknown user, " + username + "",
              loggedInUsersPage: false,
              firstname: "Unknown",
              lastname: "Unknown"
            }
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
      }
    }
  );
})