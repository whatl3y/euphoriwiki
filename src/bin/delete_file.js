import minimist from 'minimist'
import async from 'async'
import FileHandler from "../libs/FileHandler.js"
import config from "../config.js"

const argv = minimist(process.argv.slice(2))

//node bin/upload_file -p path_to_my_file
//node bin/upload_file -p path_to_my_file1 -p path_to_my_file2
let fileNames = argv.p || argv.path || argv.file || argv.f || null
fileNames = (typeof fileNames === "string") ? [fileNames] : fileNames;

async.waterfall([
  callback => config.mongodb.initialize(callback),
  (_, callback) => {
    fh = new FileHandler({ db: config.mongodb.filedb })
    const parallelFunctions = fileNames.map(f => _callback => fh.deleteFile({ filename: f }, _callback))
    async.parallel(parallelFunctions, callback)
  }
],
  function(err) {
    config.mongodb.MDB.close()
    config.mongodb.fileMDB.close()

    if (err)
      console.log(err)
  }
)
