import async from "async"
import bunyan from "bunyan"
import FileHandler from "../libs/FileHandler.js"
import GetHTML from "../libs/GetHTML.js"
import Auth from "../libs/Authentication.js"
import Audit from "../libs/Audit.js"
import GeoIP from "../libs/GeoIP"
import WikiHandler from "../libs/WikiHandler.js"
import config from "../config.js"

const log = bunyan.createLogger(config.logger.options())

module.exports = async function(req, res) {
  var A = new Auth({ session: req.session })
  var fh = new FileHandler({ db: config.mongodb.filedb })
  var wiki = new WikiHandler({ path: '/' })
  var gH = new GetHTML()

  let realClientIpAddress = (req.headers['x-forwarded-for'] || req.remote_ip || req.ip).split(',')
  realClientIpAddress = realClientIpAddress[realClientIpAddress.length - 1]
  const location = await GeoIP.location(realClientIpAddress)

  var username = A.username

  async.waterfall([
    function(callback) {
      config.mongodb.db.collection("themes").find({ type:"global" }).toArray(callback)
    },
    function(theme,callback) {
      if (theme instanceof Array && theme.length) {
        var homeBodyFile = theme[0].home_page;
        if (!homeBodyFile) return callback(null,theme[0],"","")

        fh.getFile({filename:homeBodyFile, encoding:"utf8"},function(e,data) {
          callback(e,theme[0],homeBodyFile,data)
        })
      } else {
        return callback(null,{},"","")
      }

    },
    function(theme,filename,fileContent,callback) {
      if (fileContent) {
        try {
          var method = gH.extension(filename).substring(1).toLowerCase()

          gH[method](fileContent,function(err,html) {
            return callback(err,theme,html)
          })

        } catch(err) {
          return callback(err,theme,"")
        }
      } else {
        return callback(null,theme,"")
      }
    }
  ],
    function(err,theme,bodyHtml) {
      if (err) {
        res.render("index",config.view.send(req))
        return log.error(err)
      } else if (username && req.session.returnTo) {
        var redirectTo = req.session.returnTo
        req.session.returnTo = null
        req.session.save()
        return res.redirect(redirectTo)
      }

      var mainColumnLength = 12;
      if (typeof theme.home_page_addons === "object") {
        for (var _k in theme.home_page_addons) {
          if (theme.home_page_addons[_k].alignment === "left" || theme.home_page_addons[_k].alignment === "right")
            mainColumnLength -= 3;
        }
      } else {
        mainColumnLength = 6;
      }

      res.render("index", config.view.send(req, { iobj: { homeBody: bodyHtml, theme: theme, mainColumnLength: mainColumnLength }}))

      var audit = new Audit({ ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent'] })
      audit.log({ type:"Visit Home Page" })
      wiki.event({ type: "visitpage", params: { location: location }}, function(e,result) {if (e) log.error(e);});
    }
  )
}
