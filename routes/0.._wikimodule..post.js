(function(req,res) {
  var info = req.body;
  
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db:config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var username = A.username;
  var wiki = new WikiHandler({path:decodeURI(info.page || "")});
  
  switch(info.type) {
    case "getModule":
      var uid = info.id;
      var fh = new FileHandler({db:config.mongodb.db});
      var gH = new GetHTML();
      
      if (uid) {
        config.mongodb.db.collection("wiki_modules_instances").find({uid:uid}).toArray(function(e,instance) {
          if (e) {
            log.error(e);
            res.json({success:false, error:e});
          } else {
            if (instance.length) {
              instance = instance[0];
              
              config.mongodb.db.collection("wiki_modules").find({ key:instance.modulekey }).toArray(function(_e,module) {
                if (_e) {
                  log.error(_e);
                  res.json({success:false, error:_e});
                } else {
                  if (module.length) {
                    module = module[0];
                    
                    async.parallel([
                      function(callback) {
                        try {
                          new CodeRunner({code:module.code, params:Object.merge(instance.config || {},{callback:callback})}).eval();
                          
                          //if the code in module.code does not call callback after 30 seconds, do it here.
                          setTimeout(function() {
                            try {
                              callback(null,"No results were returned from the code.");
                            } catch(e) {}
                          },30000);
                          
                        } catch(e) {
                          callback(e);
                        }
                      }
                    ],
                      function(err,results) {
                        if (err) res.json({success:false, error:err});
                        else {
                          var result = results[0];
                          
                          fh.getFile({filename:module.template, encoding:"utf8"},function(__e,fileContents) {
                            if (__e) {
                              log.error(__e);
                              res.json({success:false, error:__e});
                            } else {
                              var ext = gH.extension(module.template);
                              gH[ext.substring(1)](fileContents,function(___e,viewHtml) {
                                res.json({
                                  success: true,
                                  results: result,
                                  template: viewHtml
                                });
                              });
                            }
                          });
                        }
                      }
                    );
                  } else res.json({success:false, error:"We couldn't find the module provided. Please make sure the module has not been delete by contacting your wiki administrator."});
                }
              });
              
            } else res.json({success:false, error:"We couldn't find the module instance provided. Please ensure your ID is correct."});
          }
        });
      } else res.json({success:false, error:"Please provide a valid ID for the module."});
      
      break;
    
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})