(function(req,res) {
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  var username = req.session.username || "";
  
  req.session.destroy();
  res.redirect("/");
  
  new WikiHandler().event({type:"logout", params:{username:username}},function(e,result) {if (e) log.error(e);});
  audit.log({type:"Logout", user:username});
})