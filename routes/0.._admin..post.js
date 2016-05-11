(function(req,res) {
  var info = req.body;
  
  switch(info.type) {
    case "init":
      config.mongodb.db.collection("adminsettings").find({active:{$not:{$eq:false}}}).sort({name:1}).toArray(function(_e,settings) {
        if (_e) {
          log.error(_e);
          res.json({success:false});
        } else {
          for (var _i=0; _i<settings.length; _i++) {
            var h = jade.renderFile(__dirname+'/views/adminsettings/'+settings[_i].include);
            settings[_i].html = h;
          }
          
          res.json({success:true, settings:settings});
        }
      });
      
      break;
    
    case "save":
      var settingKey = info.key;
      var value = info.value;
      value = Object.removeDollarKeys(value);
      
      async.series([
        function(callback) {
          config.mongodb.db.collection("adminsettings").update({domid:settingKey},{$set:{value:value}},function(err) {
            if (err) res.json({success:false, error:"There was an issue saving your setting. Please check the logs or try again."});
            else res.json({success:true});
            
            callback(err);
          });
        },
        function(callback) {
          config.mongodb.db.collection("adminsettings").find().toArray(function(e,settings) {
            callback(e,settings);
          });
        },
        function(callback) {
          new WikiHandler().initQueries(function(err,data) {
            callback(err,data);
          });
        }
      ],
        function(err,results) {
          if (err) return log.error(err);
          
          var settings = results[1];
          var queries = results[2].queries;
          var oData = results[2].oData;
          
          //reset config cache and execute initial queries
          //that will reset information in config file
          config.admin.SETTINGS = settings;
          _.each(queries,function(queryInfo) {
            if (queryInfo.extracode) {
              try {
                eval(queryInfo.extracode);
              } catch(err) {
                log.error(err);
              }
            }
          });
        }
      );
      
      break;
    
    case "visitors":
      res.json({success:true, visitors:config.socketio.CACHE.sockets});
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})