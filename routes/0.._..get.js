(function(req,res) {
  res.render("index",config.view.send(req));
  
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  audit.log({type:"Visit Home Page"});
})