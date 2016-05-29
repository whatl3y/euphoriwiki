(function(req,res) {
  var info = req.body;
  
  var A = new Auth({session:req.session});
  var username = A.username;
  
  var Access = new AccessManagement({db:config.mongodb.db});
  
  switch(info.type) {
    case "initialize":
      async.parallel([
        function(callback) {
          async.waterfall([
            function(_callback) {
              config.mongodb.db.collection("wikicontent").find({path:/^\/[^\/]+$/, aliasfor:{$exists:false}},{_id:0,path:1}).sort({path:1}).toArray(function(e,mainPages) {
                _callback(e,mainPages);
              });
            },
            function(mainPages, _callback) {
              Access.onlyViewablePaths({session:req.session, username:A.username, paths:mainPages},function(e,paths) {
                _callback(e,paths);
              });
            }
          ],
            function(err,filteredPaths) {
              return callback(err,filteredPaths);
            }
          );
        },
        function(callback) {
          config.mongodb.db.collection("homewidgets").find({active:true}).toArray(function(_e,widgets) {
            callback(_e,widgets);
          });
        }
      ],
        function(err,results) {
          if (err) {
            log.error(err);
            res.json({success:false, error:err});
          }
          
          var categories = results[0] || [];
          var widgets = results[1] || [];
          
          log.debug("Got widgets: ",widgets);
          
          var aWidgets = _.map(widgets,function(widget) {
            var sortObject = {};
            if (widget.orderField) sortObject[widget.orderField] = widget.orderDirection;
            
            return {
              collection: widget.collection,
              key: widget.name,
              filters: Object.merge(widget.filter || {},{aliasfor:{$exists:false}}),
              sort: sortObject,
              limit: widget.limit || null,
              fields: widget.fields || {}
            };
          });
          
          config.mongodb.MDB.findRecursive({
            db: config.mongodb.db,
            array: aWidgets
          },function(err,oData) {
            if (err) res.json({success:false, error:err});
            else {
              log.debug("Got data for widgets: ",oData);
              
              var keys = _.keys(oData);
              
              //filter out any paths in the widgets that the user cannot
              //view based on admin and view scope settings.
              async.each(keys,function(k,callback) {
                log.debug("Looping through widgets to filter paths:",k,oData[k]);
                
                Access.onlyViewablePaths({session:req.session, username:username, paths:oData[k]},function(err,filtered) {
                  oData[k] = filtered;
                  callback(err)
                });
              },
                function(err) {
                  if (err) {
                    log.error(err);
                    res.json({success:false, error:err});
                  } else {
                    var returnedWidgets = [];
                    _.each(keys,function(k) {
                      returnedWidgets.push({
                        items: oData[k] || [],
                        name: k
                      });
                    });
                    
                    res.json({success:true, widgets:returnedWidgets, categories:categories});
                    log.debug("Widgets returning to client: ",returnedWidgets);
                  }
                }
              );
            }
          });
        }
      );
      
      break;
      
    case "somethingelse":
      
      
      break;
      
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})