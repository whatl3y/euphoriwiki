import bunyan from "bunyan"
import async from "async"
import Auth from "../libs/Authentication.js"
import AccessManagement from "../libs/AccessManagement.js"
import WikiHandler from "../libs/WikiHandler.js"
import Audit from "../libs/Audit.js"
import config from "../config.js"

const log = bunyan.createLogger(config.logger.options())

module.exports = function(req,res) {
  var path = (req.params[0].indexOf("favicon.ico") == 0) ? null : "/"+req.params[0];

  var wiki = new WikiHandler({path:path});
  var A = new Auth({session:req.session});
  var Access = new AccessManagement({db: config.mongodb.db});
  var audit = new Audit({user:A.username, ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});

  var username = A.username;

  if (path) {
    path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();

    async.parallel([
      function(callback) {
        return callback();
        config.mongodb.db.collection("custom_routes").find({path:path}).toArray(function(_e,doc) {
          callback(_e,doc)
        });
      }
    ],
      function(err,results) {
        if (err) {
          res.redirect('/');
          return log.error(err);
        }

        var route_info = results[0];
        console.log(route_info);

        return res.send(path);
        return res.render("wikipage",config.view.send(req,{obj:oView, iobj:{pageInfo:{content_html:pageHtml}}, title:path}));
      }
    );

    // audit.log({type:"Visit Page", additional:{path:path}});
  } else {
    res.redirect('/');
  }
}
