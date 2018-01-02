import WikiHandler from "../libs/WikiHandler.js"

module.exports = function(req,res) {
  var query = req.body.query;
  var wiki = new WikiHandler();

  wiki.searchPages(query,function(e,pages) {
    if (e) res.json({error:e});
    else {
      res.json({pages:pages});
    }
  });
}
