import DirectoryProcessor from "../libs/DirectoryProcessor"

var D = new DirectoryProcessor();

//filepath should be in 3rd param
//    EXAMPLE CALL: >node processdir pathToDirectory
var directory = process.argv[2];

if (D.fileOrDirExists(directory)) {
  D.processDir({dirpath:directory, recurse:true},function(err,obj) {
    var s = (err) ? {error:err} : obj;
    process.send(s);
  });
} else {
  process.send({error: "We could not find the directory you entered."});
}
