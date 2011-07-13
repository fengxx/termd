var exty = require('./build/default/ptyext');
var hi=new exty.PseudoTerminal();
var fds=hi.openpty();
var childProcess=new exty.PseudoTerminal();

childProcess.onexit = function(code, signal) {
    console.log("exit");
}
var stream = require('net').Stream(fds[0]);
    stream.readable = stream.writable = true;
    stream.resume();
    stream.on('data', function (data) {
        console.log(data.toString("utf8"));
    });
//check spwan
childProcess.spawn("/bin/bash",[],fds[1]);
stream.write("echo \"it works,shell pid is $$\" \n");
setTimeout(function(){
    stream.pause();
	childProcess.kill(9);
},2000);


//childProcess.spawn("/bin/bash",[],fds[1]);

