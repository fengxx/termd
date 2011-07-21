var binding = process.binding('stdio');
var wterm=require("./vt102.js");
var subShell = exports.subShell = function(rows,cols,ondata,onclose){
    var env={};
    env.COLUMNS=cols;
    env.LINES=rows;
    env.TERM="vt100";
    console.log("env is "+env);
    this.backport=0;
    var pty=this.openShell('/bin/bash',env,rows,cols);    
    this.sin=pty[0];
    this.sout=pty[1];
    this.shell = pty[2];    
    var term=new wterm.Terminal(rows,cols,this.sin);    
    this.sout.on('data', function (data) {
        term.process(data); 
        ondata(term.dumpHTML());
    });	
    this.shell.on("exit",function(){
            console.log("shell exit");
            onclose();
    });	
    this.tm=term;    
}

subShell.prototype.openShell=function(path, env,height,width){
    var stream_in,stream_out,child;
    var spawn = require('child_process').spawn;
    if(typeof binding["openpty"]=="function"){
        var fds=binding.openpty();
        //set windows size
        binding.setWindowSize(fds[0],height,width);
        stream_in=initStream(fds[0]);
        stream_out=stream_in;
        child = spawn(path, ["-l"], {
        env: env,
        customFds: [fds[1], fds[1], fds[1]],
        setsid: true
        });
        console.log("using node implement");
      }else {
        //change PS1 because in webos workfolder /media/cryptofs/apps/usr/palm/services/ is too long
        env["PS1"]='\\$';
        child = spawn('./backport/ptyrun', ['/bin/sh'], {
        env: env
        });
        stream_out=child.stdout;
        stream_in=child.stdin;
        console.log("using ptyrun");
      }
    //resume stdin   
    stream_in.resume();
    return [stream_in,stream_out,child];
}

function initStream(fd){
var stream = require('net').Stream(fd);
    stream.readable = stream.writable = true;
    return stream;
}

subShell.prototype.Write = function(data){
    var shStdin=this.sin;    
    //process.binding('stdio').setRawMode(true);
    shStdin.resume();
    shStdin.write(data);
    shStdin.flush();
    //console.log(data.charCodeAt(0));
}

subShell.prototype.Close= function(){
    console.log("called close");
    try {
        //this.sin.pause();
        this.shell.kill('SIGKILL');   
    } catch (err) {
         console.log(err);
    }
}

subShell.prototype.getOutput= function(){
    return this.tm.dumpHTML();
}