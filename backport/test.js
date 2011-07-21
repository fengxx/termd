var spawn = require('child_process').spawn;
var child=spawn('./ptyrun', ['/bin/sh']);
child.stdout.on("data",function(data){
    console.log(data);
});
child.stderr.on("data",function(data){
    console.log(data);
});
child.on("exit",function(){
    console.log("exit pty");
});
child.stdin.write("\x1B\x1B\x1B\x24\x56\n");
child.stdin.flush();
child.stdin.write("ls\n");
//child.stdin.write("stty -a\n");
setTimeout(function(){
    child.stdin.write("stty -a\n");
	child.kill("SIGTERM");
},2000);
