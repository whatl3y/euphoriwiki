import fs from "fs"
import mammoth from "mammoth"
import GetHTML from "../libs/GetHTML.js"

var gH = new GetHTML();

//filepath should be in 3rd param
//    EXAMPLE CALL: >node wordtohtml pathToFile
var filePath = process.argv[2];

if (filePath) {
  mammoth.convertToHtml({ path: filePath }).then(function(result) {
    var returnedResult = result.value.replace(/\<table\>/g,"<table class='table table-bordered table-striped'>");
    gH.html(returnedResult,function(err,h) {
      process.send((err) ? {error: err} : h);
    });

  }).catch(function(err) {
    process.send({error: err});
  });
} else {
  process.send({error: "No file to process"});
}
