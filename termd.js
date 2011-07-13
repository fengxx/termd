require.paths.unshift('./lib'); 
var http = require('http'), 
url = require('url'),
fs = require('fs'),
io = require('socket.io'),
sys = require('sys'),
QueryString=require("querystring"),
sh=require("./subshell");

       
var server = http.createServer(function(req, res){
    var path = url.parse(req.url).pathname;
    path= (path=="/"?"/term.html":path);
    path= (path=="/wsocket_client.js"?"/lib/wsocket_client.js":path);
    console.log("req "+path);
    switch (path){		
        case '/term_client.js':
        case '/term_client.css':
        case '/lib/wsocket_client.js':
        case '/term.html':
            fs.readFile(__dirname + path, function(err, data){
                if (err) return send404(res);
                res.writeHead(200, {
                    'Content-Type': getMIME(path)
                })
                res.write(data, 'utf8');
                res.end();
            });
            break;
			
        default:
            send404(res);
    }
}),
getMIME=function(path){
    var mime="text/plain";
    if(path.match(/js$/)){
        mime="text/javascript";
    }else if(path.match(/htm.?$/)){
        mime="text/html";
    }else if(path.match(/css$/)){
        mime="text/css";
    }
    return mime;
}
send404 = function(res){
    res.writeHead(404);
    res.write('404');
    res.end();
};
var terms={};

var terminateProcess=function(){
        //close all child shells
        for(var sid in terms){
            var clientShell=terms[sid] 
            if(clientShell !=null && typeof clientShell["Close"] !="undefined"){
                clientShell.Close();
            }
        }
        //exit process
        console.log("clean up and exit");
        process.exit(0);
}
//Interrupt from keyboard
process.on('SIGINT', terminateProcess);
//Hangup detected on controlling terminal or death of controlling process
process.on('SIGHUP', terminateProcess);
//can not trap KILL. TODO FIX THIS
process.on('SIGKILL', terminateProcess);
process.on('SIGTERM', terminateProcess);
process.on('SIGPIPE', terminateProcess);

process.addListener('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});


server.listen(8180);
var socketio = io.listen(server);		
socketio.on('connection', function(client){
    console.log("client is "+client.sessionId);
    terms[client.sessionId]=new sh.subShell(30,80,
        function(output){
            //console.log(output);
            client.send({
                term:output
            });
        },
        function(){
            console.log("client will be closed");
            client._onClose();
            //remove from list
            if(typeof terms[client.sessionId] !="undefined") {
               terms[client.sessionId]=null;
               delete terms[client.sessionId];
            }
        }
        );
        
    //add outputs    
    client.on('message', function(message){
        //process input
        if(typeof terms[client.sessionId] !="undefined"){ 
                var msg=QueryString.unescape(message);
                terms[client.sessionId].Write(msg);
            }
        }
   );

    client.on('disconnect', function(){
        console.log("client exit");
        if(typeof terms[client.sessionId] !="undefined" && terms[client.sessionId] !=null){
            terms[client.sessionId].Close();
        }
        delete terms[client.sessionId];
    });
});

