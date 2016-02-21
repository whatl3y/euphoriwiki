(function(req,res) {
  var info = req.body;
  
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db:config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var username = A.username;
  
  Access.isWikiAdmin(username,function(e,isAdmin) {
    if (e) res.json({success:false, error:e});
    else if (!isAdmin) res.json({success:false, error:"You must be a wiki administrator to make changes on this page."});
    else {
      switch(info.type) {
        case "init":
          async.parallel([
            function(callback) {
              config.mongodb.db.collection("defaultevents").find({},{_id:0}).toArray(function(e,events) {
                callback(e,events);
              });
            },
            function(callback) {
              config.mongodb.db.collection("event_types").find({}).sort({type:1}).toArray(function(e,types) {
                callback(e,types);
              });
            }
          ],
            function(e,results) {
              if (e) {
                log.error(e);
                res.json({success:false, error:e});
              } else {
                var defaultEvents = results[0];
                var eventTypes = results[1];
                eventTypes = eventTypes.map(function(t) {return t.type;});
                
                res.json({success:true, events:defaultEvents, eventTypes:eventTypes});
              }
            }
          );
          
          break;
          
        case "save":
          var events = info.events || [];
          events = events.map(function(e) {
            return Object.removeDollarKeys(e);
          });
          
          config.mongodb.db.collection("defaultevents").remove({},function(_e) {
            config.mongodb.db.collection("defaultevents").insert(events,function(__e) {
              var error = _e || __e || null;
              
              if (error) res.json({success:false, error:error});
              else res.json({success:true});
            });
          });
          
          break;
        
        default:
          res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
      }
    }
  });
})