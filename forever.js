var forever = require('forever-monitor');

var times = 10
var child = new (forever.Monitor)('server.js', {
  max: times,
  silent: false,
  args: []
})

child.on('exit', function () {
  console.log(`index.js has exited after ${times} restarts`);
})
child.start()
