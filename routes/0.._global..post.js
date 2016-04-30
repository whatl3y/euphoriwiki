(function(req,res) {
  var info = req.body;
  
  var A = new Auth({session:req.session});
  var username = A.username;
  
  var Access = new AccessManagement({db:config.mongodb.db});
  var wiki = new WikiHandler();
  
  switch(info.type) {
    case "init":
      async.waterfall([
        function(callback) {
          wiki.getPage({filters:{aliasfor:{$exists:false}},fields:{path:1,_id:0},sort:{path:1}},function(e,pages) {
            callback(e,pages);
          });
        },
        function(pages,callback) {
          Access.onlyViewablePaths({session:req.session, username:username, paths:pages},function(err,filteredPages) {
            callback(err,filteredPages);
          });
        }
      ],
        function(err,filteredPages) {
          if (err) {
            log.error(err);
            return res.json({success:false, error:err});
          }
          
          return res.json({success:true, allpages:filteredPages});
        }
      );
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})