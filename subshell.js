var binding = process.binding('stdio');
var wterm=require("./vt102.js");
var subShell = exports.subShell = function(rows,cols,ondata,onclose){
    var env={};
    env.COLUMNS=cols;
    env.LINES=rows;
    env.TERM="vt100";
    console.log("env is "+env);
    this.backport=0;
    var pty=this.openShell('/bin/bash',env,null,rows,cols);
    this.stream=pty[0];
    this.shell = pty[1];    
    var term=new wterm.Terminal(cols,rows);    
    this.stream.on('data', function (data) {
        term.process(data); 
        ondata(term.dumpHTML());
    });	
    //check if Backporting
    if(this.backport){
        //not implement EventEmitter
        console.log("backporting");
        this.shell.onexit=function(){            
            onclose();
        }
    }else{
        this.shell.on("exit",function(){
            console.log("shell exit");
            onclose();
        });	
    }
    this.tm=term;    
}

subShell.prototype.openShell=function(path, env,args,height,width){
    var fds,child;
    if(typeof binding["openpty"]=="Function"){
        fds=binding.openpty();
        //set windows size for slave
        binding.setWindowSize(fds[1],height,width);
        stream=initStream(fds[0]);
        var spawn = require('child_process').spawn;
        child = spawn(path, args, {
        env: env,
        customFds: [fds[1], fds[1], fds[1]],
        setsid: true
        });
        console.log("using node implement");
    }else{
        //backward compatible for node v0.2.3 which shiped with webos
        //implemnt pty support and setsid call in spawn process
        console.log("backward compatible");
        var ptylibAddon = require('./ptyext');        
        var child=new ptylibAddon.PseudoTerminal();
        fds=child.openpty();
        child.setWindowSize(fds[1],height,width);
        stream=initStream(fds[0]);
        //default implement
        child.onexit = function(code, signal) {
            console.log(" signal is "+signal);
        }
        this.backport=1;
        child.spawn(path,args,fds[1]);
    };
    return [stream, child];
}

function initStream(fd){
var stream = require('net').Stream(fd);
    stream.readable = stream.writable = true;
    stream.resume();
    return stream;
}

subShell.prototype.Write = function(data){
    var shStdin=this.stream;    
    //process.binding('stdio').setRawMode(true);
    shStdin.resume();
    shStdin.write(data);
    shStdin.flush();
    //console.log(data.charCodeAt(0));
}

subShell.prototype.Close= function(){
    console.log("called close");
    stream.pause();
    if(this.backport){
        //not implement string to number convert, man 7 signal
        this.shell.kill(9);
    }else{
        this.shell.kill('SIGKILL');
    }
}

subShell.prototype.getOutput= function(){
    return this.tm.dumpHTML();
}
