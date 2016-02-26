(function(req,res) {
  var wiki = new WikiHandler();
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db: config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var username = A.username;
  
  var o = {};
  o.loggedIn = (req.session.loggedIn) ? true : false;
  o.pagePieces = wiki.pageTree(req.params[0]);
  var path = (req.params[0].indexOf("favicon.ico") == 0) ? null : "/"+req.params[0];
  
  // NOTE: need to move this to class at some point
  // increment the page visits for the page
  if (path) {
    path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();
    
    async.parallel([
      function(callback) {
        config.mongodb.db.collection("wikicontent").findAndModify({path:path},[],{"$inc":{pageViews:1}},{ new:1 },function(_e,doc) {
          callback(_e,doc)
        });
      },
      function(callback) {
        Access.canViewPage({session:req.session, username:username, path:path},function(e,canView) {
          callback(e,canView);
        });
      }
    ],
      function(err,results) {
        if (err) log.error(err);
        else {
          var page = results[0] || {};
          var canViewPage = results[1];
          
          if (!canViewPage) res.redirect("/?auth=" + path);
          else if (page.aliasfor) res.redirect(page.aliasfor);
          else res.render("wikipage",config.view.send(req,{obj:o,title:path}));
        }
      }
    );
    
    audit.log({type:"Visit Page", additional:{path:path}});
  } else {
    res.render("wikipage",config.view.send(req,{obj:o}));
  }
})