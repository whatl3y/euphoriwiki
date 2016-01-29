(function(req,res) {
  var query = req.params.query;
  var wiki = new WikiHandler();
  
  wiki.searchPages(query,function(e,pages) {
    if (e) res.send(e);
    else {
      res.render("search",config.view.send(req,{obj:{pages:pages}}));
    }
  });
})