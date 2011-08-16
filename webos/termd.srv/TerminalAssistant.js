function TerminalAssistant() {
}

TerminalAssistant.prototype.run=function(future, subscription) {
    this.setupTerm();
    future.result = {
        url:this.url
    };
    this.interval = setInterval(
        function ping() {
            var f = subscription.get();
            var t=Number(new Date());
            f.result = {
                heartbeat: t
            };
        }, 500);  
}

TerminalAssistant.prototype.cancelSubscription=function(){
    clearInterval(this.interval);
}

TerminalAssistant.prototype.setupTerm=function(){
    var port=50530;
    this.url="http://localhost:"+port;
    // Node.js require load
    if (typeof require === "undefined") {
        require = IMPORTS.require;        
    }
    require.paths.unshift(process.cwd());
    var extLog=require("Logger");
    var logger=new extLog.Logger(1,"/tmp/debug_term.log");
    logger.hook();
    var serv=require("term_server");
    console.log("server is starting");	
    var termd=new serv.termServer(port,24,100);
    termd.setupSocket();
    process.addListener('uncaughtException', function (err) {
        logger.log('Caught exception: ' + err);
    });
    console.log("server is started");
};