import FileHandler from "../libs/FileHandler.js"
import config from "../config.js"

module.exports = function(req,res) {
  var filename = req.params.filename;

  if (!filename) return res.send("Please enter a valid filename.");

  var fh = new FileHandler({db:config.mongodb.filedb});
  fh.findFiles({filename:filename,one:true},function(err,file) {
    if (err) return res.send(err);
    if (!file) return res.send("Sorry, we could not file a file with filename: " + filename + ".");

    var contentType = file.contentType;
    //var length = file.length;

    res.setHeader("contentType",contentType);
    var readStream = fh.gfs.createReadStream({filename:filename});
    readStream.pipe(res);
  });
}
