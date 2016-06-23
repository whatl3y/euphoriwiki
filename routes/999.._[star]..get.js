var async = require("async");
var Auth = require("../libs/Authentication.js");
var AccessManagement = require("../libs/AccessManagement.js");
var WikiHandler = require("../libs/WikiHandler.js");
var Audit = require("../libs/Audit.js");
var config = require("../libs/config.js");
var log = require("bunyan").createLogger(config.logger.options());

module.exports = function(req,res) {
  var wiki = new WikiHandler({path:req.originalUrl});
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db: config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});

  var username = A.username;
  var oView = {};

  var path = (req.params[0].indexOf("favicon.ico") == 0) ? null : "/"+req.params[0];

  // NOTE: need to move this to class at some point
  // increment the page visits for the page
  if (path) {
    path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();

    async.parallel([
      function(callback) {
        config.mongodb.db.collection("wikicontent").findAndModify({path:path},[],{"$inc":{pageViews:1}},{ new:1 },function(_e,doc) {
          callback(_e,doc)
        });
      },
      function(callback) {
        wiki.getPageContent(function(e,html) {
          callback(e,html);
        });
      },
      function(callback) {
        Access.isAdmin({username:username, path:path},function(e,canEdit) {
          callback(e,canEdit);
        });
      },
      function(callback) {
        Access.isAdmin({username:username, path:path, editOnly:false},function(e,isAdmin) {
          callback(e,isAdmin);
        });
      },
      function(callback) {
        Access.canViewPage({session:req.session, username:username, path:path},function(e,canView) {
          callback(e,canView);
        });
      },
      function(callback) {
        wiki.validatePassword({session:req.session},function(e,validated) {
          callback(e,validated);
        })
      }
    ],
      function(err,results) {
        if (err) {
          res.render("wikipage",config.view.send(req,{}));
          return log.error(err);
        }

        var page = results[0].value || {};
        var pageHtml = results[1] || "";
        var canEditPage = results[2];
        var canViewPage = results[3] || results[4];
        var passwordValidated = results[5];

        oView.loggedIn = (req.session.loggedIn) ? true : false;
        oView.pagePieces = wiki.pageTree(req.params[0]);
        oView.canSeeEditButton = (oView.loggedIn && canEditPage);

        if (!canViewPage) return res.redirect("/?auth=" + path);
        else if (page.aliasfor) return res.redirect(page.aliasfor);
        else if (!passwordValidated) pageHtml = "";

        return res.render("wikipage",config.view.send(req,{obj:oView, iobj:{pageInfo:{content_html:pageHtml}}, title:path}));
      }
    );

    audit.log({type:"Visit Page", additional:{path:path}});
  } else {
    res.render("wikipage",config.view.send(req,{obj:oView}));
  }
}
