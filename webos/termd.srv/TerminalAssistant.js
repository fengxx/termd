function TerminalAssistant() {
}

TerminalAssistant.prototype.run=function(future, subscription) {    
    future.result = {
        html:"http://localhost:50530"
    };
    this.setupTerm();
    this.interval = setInterval(
        function ping() {
            var f = subscription.get();
           update status
            var t=Number(new Date());
            f.result = {
                "keepalive": t
            };
        }, 1000);
}

TerminalAssistant.prototype.cancelSubscription=function(){
    clearInterval(this.interval);
}

TerminalAssistant.prototype.setupTerm=function(){
    // Node.js require load
    if (typeof require === "undefined") {
        require = IMPORTS.require;
        require.paths.unshift(process.cwd()); 
    }
    var serv=require("term_server");
    var extLog=require("Logger");
    var logger=new extLog.Logger(1,"/tmp/debug_term.log");
    logger.hook();
    console.log("server is starting");
    var termd=new serv.termServer(50530,20,100);
    termd.setupSocket();
    process.addListener('uncaughtException', function (err) {
        logger.log('Caught exception: ' + err);
    });
    console.log("server is started");
};