function TerminalAssistant() {
}

TerminalAssistant.prototype.setup=function(){
    this.inv=2000;
    this.setupTerm();
}

TerminalAssistant.prototype.run=function(future, subscription) {
    future.result = {
        html:"http://localhost:50530"
    };
    var self=this;
    this.interval = setInterval(
        function ping() {
            var f = subscription.get();
            //update status
            var t=Number(new Date());
            f.result = {
                "keepalive": t
            };
        }, self.inv);
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
    require('termd');
};