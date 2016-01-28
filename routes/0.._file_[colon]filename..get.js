(function(req,res) {
  var filename = req.params.filename;
  
  var gfs = Grid(config.mongodb.db, mongo);
  gfs.files.find({filename: filename}).toArray(function (err, files) {
    if (err) res.send(err);
    else if (!files.length) res.send("Sorry, we could not file a file with filename: " + filename + ".");
    else {
      var file = files[0];
      var contentType = file.contentType;
      //var length = file.length;
      
      res.setHeader("contentType",contentType);
      var readStream = gfs.createReadStream({filename:filename});
      readStream.pipe(res);
    }
  })
})