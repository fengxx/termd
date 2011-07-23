var serv=require("./term_server");
var extLog=require("./Logger");
var logger=new extLog.Logger(1,"/tmp/debug_term.log");
logger.hook();
var termd=new serv.termServer(50530,30,120);
termd.setupSocket();
console.log("server started")
process.addListener('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
