require.paths.unshift('./lib'); 
var http = require('http'), 
url = require('url'),
fs = require('fs'),
io = require('socket.io'),
QueryString=require("querystring"),
sh=require("./subshell");

var termServer=exports.termServer=function(port,width,height){
    this.terms={};
    this.width=width;
    this.height=height;
    this.port=port;
    var self=this;
    this.server=http.createServer(function(req, res){
        var path = url.parse(req.url).pathname;
        path= (path=="/"?"/term.html":path);
        path= (path=="/wsocket_client.js"?"/lib/wsocket_client.js":path);
        //don't allow relative path        
        path=path.replace(/\.\./g,'');
        if(path=='/admin/stop'){
            res.writeHead(200, {
                'Content-Type': "text/plain"
            })
            res.write("stoped", 'utf8');
            res.end();
            console.log("try to stop servie");
            self.terminateHandler();
        }else {
            fs.readFile(__dirname + path, function(err, data){
            if (err) return send404(res);
            res.writeHead(200, {
                'Content-Type': getMIME(path)
            });
            res.write(data, 'utf8');
            res.end();
            });
        }
    });
}

termServer.prototype={
    hookExitSignal:function(){
        //Interrupt from keyboard
        process.on('SIGINT', this.terminateHandler);
        //Hangup detected on controlling terminal or death of controlling process
        process.on('SIGHUP', this.terminateHandler);
        //can not trap KILL. TODO FIX THIS
        //process.on('SIGKILL', this.terminateHandler);
        process.on('SIGTERM', this.terminateHandler);
        process.on('SIGPIPE', this.terminateHandler);
    },
    terminateHandler: function(){
        //close all child shells
        for(var sid in this.terms){
            var clientShell=this.terms[sid] 
            if(clientShell !=null && typeof clientShell["Close"] !="undefined"){
                clientShell.Close();
            }
        }
        //exit process
        console.log("clean up and exit");
        process.exit(0);
    },
    setupSocket:function(){
        var self=this;
        self.server.listen(this.port);
        var socketio = io.listen(self.server);		
        socketio.on('connection', function(client){
            console.log("client is "+client.sessionId);
            console.log("date at " +new Date() +" cwd "+process.cwd());  
            self.terms[client.sessionId]=new sh.subShell(self.width,self.height,
                function(output){
                    //console.log(output);
                    client.send({
                        term:output
                    });
                },
                function(){
                    console.log("client "+client.sessionId+"will be closed");
                    client._onClose();
                    //remove from list
                    if(typeof self.terms[client.sessionId] !="undefined") {
                        self.terms[client.sessionId]=null;
                        delete self.terms[client.sessionId];
                    }
                }
                );
            self.terms[client.sessionId].shell.on("exit",function(code, signum){
                console.log("Exited with " + (code == null ? "no exit code" : code) + (signum == null ? " no signum" : ", signal " + signum))
            });
            console.log("terminal started");
            //add outputs    
            client.on('message', function(message){
                //process input
                if(typeof self.terms[client.sessionId] !="undefined"){ 
                    var msg=QueryString.unescape(message);
                    self.terms[client.sessionId].Write(msg);
                }
            }
            );
            client.on('disconnect', function(){
                console.log("client exit");
                if(typeof self.terms[client.sessionId] !="undefined" && self.terms[client.sessionId] !=null){
                    self.terms[client.sessionId].Close();
                }
                delete self.terms[client.sessionId];
            });
        });
    }
}

var getMIME=function(path){
    var mime="text/plain";
    if(path.match(/js$/)){
        mime="text/javascript";
    }else if(path.match(/htm.?$/)){
        mime="text/html";
    }else if(path.match(/css$/)){
        mime="text/css";
    }else if(path.match(/png$/)){
        mime="image/png";
    }
    return mime;
}
send404 = function(res){
    res.writeHead(404);
    res.write('404');
    res.end();
};
