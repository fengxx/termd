var fs = require('fs');
var w=require("./vt102.js");
var term=new w.Terminal(24,80),extLog=require("./Logger")
var logger=new extLog.Logger(1,"/tmp/debug_term.log");
logger.hook();
logger.log(require.paths);
var spawn = require('child_process').spawn;
var child=spawn("./backport/ptyrun", ['-w'+132,'-h'+35,'/bin/sh']);      
child.stdout.on('data', function (data) {
            term.process(data); 
            var timestamp = Number(new Date()); 
            console.log(term.dumpHTML());            
         });
         
setTimeout(function(){
	child.stdin.write("ls\n");
},500);

setTimeout(function(){
	child.stdin.write("pwd\n");
},1500);

setTimeout(function(){
	child.stdin.write("exit\n");
},2500);