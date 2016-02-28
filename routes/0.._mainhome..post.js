(function(req,res) {
  var info = req.body;
  
  var A = new Auth({session:req.session});
  var username = A.username;
  
  var Access = new AccessManagement({db:config.mongodb.db});
  
  switch(info.type) {
    case "getWidgets":
      config.mongodb.db.collection("homewidgets").find({active:true}).toArray(function(_e,widgets) {
        if (widgets.length) {
          var aWidgets = _.map(widgets,function(widget) {
            var sortObject = {};
            if (widget.orderField) sortObject[widget.orderField] = widget.orderDirection;
            
            return {
              collection: widget.collection,
              key: widget.name,
              filters: widget.filter || {},
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
              var keys = _.keys(oData);
              
              //filter out any paths in the widgets that the user cannot
              //view based on admin and view scope settings.
              async.each(keys,function(k,callback) {
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
                    
                    res.json({success:true, widgets:returnedWidgets});
                  }
                }
              );
            }
          });
        } else res.json({success:false});
      });
      
      break;
      
    case "somethingelse":
      
      
      break;
      
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})