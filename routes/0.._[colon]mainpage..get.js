(function(req,res) {
  var pages = [
    {name:"admin", view:"adminmain"}
  ];
  var mainPage = req.params.mainpage;
  
  var wiki = new WikiHandler({path:mainPage});
  var o = {};
  o.loggedIn = (req.session.loggedIn) ? true : false;
  o.pagePieces = wiki.pageTree();
  
  var page = _.filter(pages,function(p) {return p.name==mainPage});
  var view = (page.length) ? page[0].view : "wikipage";
  
  if (mainPage=="admin") {          //go to the admin page if admin, the user's personal page if not admin but logged in, or redirect to home page if not logged in
    if (!req.session.loggedIn) {
      res.redirect("/");
    } else {
      var username = req.session.sAMAccountName.toLowerCase();
      config.mongodb.db.collection("adminsettings").find({domid:"wikiadmins","value.username":{$in:[username]}}).toArray(function(_e,admin) {
        if (admin.length) {
          //get the admin settings to include
          
          res.render(view,config.view.send(req,{obj:o}));
        } else res.redirect("/user/" + username);
      });
    }
  } else if (mainPage=="user") {        //go to this user's page, or redirect back to the home page
    if (!req.session.loggedIn) {
      res.redirect("/");
    } else {
      var username = req.session.sAMAccountName.toLowerCase();
      res.redirect("/user/" + username);
    }
  } else {
    res.render(view,config.view.send(req,{obj:o}));
    
    // NOTE: need to move this to class at some point
    // increment the page visits for the page
    var path = (mainPage.indexOf("favicon.ico") == 0) ? null : "/"+mainPage;
    if (path) {
      path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();
      config.mongodb.db.collection("wikicontent").update({path:path},{"$inc":{pageViews:1}},function(_e) {
        if (_e) log.error(_e);
        else log.trace("Page, " + path + ", has been visited.");
      });
    }
  }
})