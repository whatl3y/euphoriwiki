(function(req,res) {
  var query = req.params.query;
  var wiki = new WikiHandler();
  var A = new Auth({session:req.session});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  wiki.searchPages(query,function(e,pages) {
    if (e) res.send(e);
    else {
      res.render("search",config.view.send(req,{obj:{pages:pages}}));
      
      audit.log({type:"Wiki Search", additional:{query:query}});
    }
  });
})