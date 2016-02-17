(function(req,res) {
  var info = req.body;
  
  var wiki = new WikiHandler();
  
  switch(info.type) {
    case "init":
      wiki.getPage({filters:{},fields:{path:1,_id:0}},function(e,pages) {
        if (e) res.json({success:false, error:e});
        else res.json({success:true, allpages:pages});
      });
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})