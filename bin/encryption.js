var Encryption = require("../libs/Encryption.js");

//filepath should be in 3rd param
//    EXAMPLE CALL: >node encryption [-d][-e] string
var which = process.argv[2];
var text = process.argv[3];

switch (which) {
  case "-e":
    console.log(new Encryption().encrypt(text));
    break;

  case "-d":
    console.log(new Encryption().decrypt(text));
    break;


  default:
    console.log("Please enter an argument, -e to encrypt, -d to decrypt.")
}
