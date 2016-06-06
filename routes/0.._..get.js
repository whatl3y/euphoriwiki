(function(req,res) {
  var fh = new FileHandler({db:config.mongodb.db});
  var gH = new GetHTML();
  
  async.waterfall([
    function(callback) {
      config.mongodb.db.collection("themes").find({type:"global"}).toArray(function(e,themeInfo) {
        return callback(e,themeInfo);
      });
    },
    function(theme,callback) {
      if (theme instanceof Array && theme.length) {
        var homeBodyFile = theme[0].home_page;
        
        fh.getFile({filename:homeBodyFile, encoding:"utf8"},function(e,data) {
          callback(e,homeBodyFile,data);
        });
      } else {
        return callback(null,"","");
      }
      
    },
    function(filename,fileContent,callback) {
      if (fileContent) {
        try {
          var method = gH.extension(filename).substring(1).toLowerCase();
          
          gH[method](fileContent,function(err,html) {
            return callback(err,html);
          });
          
        } catch(err) {
          return callback(err);
        }
      } else {
        return callback(null,"");
      }
    }
  ],
    function(err,bodyHtml) {
      if (err) {
        res.render("index",config.view.send(req));
        return log.error(err);
      }
      
      res.render("index",config.view.send(req,{iobj:{homeBody:bodyHtml}}));
      
      var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
      audit.log({type:"Visit Home Page"});
    }
  );
})