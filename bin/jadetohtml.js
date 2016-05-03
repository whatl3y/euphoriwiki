var fs = require("fs");
var path = require("path");
var GetHTML = require("../libs/GetHTML.js");

//filepath should be in 3rd param
//    EXAMPLE CALL: >node wordtohtml pathToFile
var isChildProcess = !!process.send;
var filePath = process.argv[2] || "";
filePath =  (path.isAbsolute(filePath)) ? filePath : __dirname + "/" + filePath;

var saveFilePath = filePath + "_" + Date.now() + ".html"

if (filePath) {
  new GetHTML({fullpath:filePath}).jade(function(err,html) {
    if (err) (isChildProcess) ? process.send({error: err}) : console.log(err);
    else {
      if (isChildProcess) process.send(html);
      else {
        fs.writeFile(saveFilePath,html,
          function(e) {
            if (e) (isChildProcess) ? process.send({error: e}) : console.log(e);
          }
        );
      }
    }
  });
  
} else {
  (isChildProcess) ? process.send({error: "No file to process"}) : console.log(err);
}