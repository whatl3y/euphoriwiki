(function(req,res) {
  var wiki = new WikiHandler();
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db: config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var o = {};
  o.loggedIn = (req.session.loggedIn) ? true : false;
  o.pagePieces = wiki.pageTree(req.params[0]);
  var path = (req.params[0].indexOf("favicon.ico") == 0) ? null : "/"+req.params[0];
  
  res.render("wikipage",config.view.send(req,{obj:o,title:path}));
  
  // NOTE: need to move this to class at some point
  // increment the page visits for the page
  if (path) {
    path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();
    config.mongodb.db.collection("wikicontent").update({path:path},{"$inc":{pageViews:1}},function(_e) {
      if (_e) log.error(_e);
      else log.trace("Page, " + path + ", has been visited.");
    });
    
    audit.log({type:"Visit Page", additional:{path:path}});
  }
})