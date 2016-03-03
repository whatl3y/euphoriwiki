(function(req,res) {
  var info = req.body;
  
  var A = new Auth({session:req.session});
  var username = A.username;
  
  var Access = new AccessManagement({db:config.mongodb.db});
  var wiki = new WikiHandler();
  
  switch(info.type) {
    case "init":
      wiki.getPage({filters:{aliasfor:{$exists:false}},fields:{path:1,_id:0},sort:{path:1}},function(e,pages) {
        if (e) {
          log.error(e);
          res.json({success:false, error:e});
        } else {
          Access.onlyViewablePaths({session:req.session, username:username, paths:pages},function(err,filteredPages) {
            if (err) {
              log.error(err);
              res.json({success:false, error:err});
            } else res.json({success:true, allpages:filteredPages});
          });
        }
      });
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})