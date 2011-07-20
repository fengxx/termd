function MainAssistant() {};
 
MainAssistant.prototype.setup = function() {
   this.debugContainer = this.controller.get("call_log");
   this.logOutputNum = 0;
};
 
MainAssistant.prototype.activate = function(event) {
   var that = this;
	//call the service using standard Palm serviceRequest
    this.controller.serviceRequest("palm://com.fengxx.term.service", {
      method: "runshell",
      parameters: {"subscribe":true},
      onSuccess:this.serviceSuccess.bind(this),
      onFailure:this.serviceFailure.bind(this)
    });
    this.controller.get("log").innerHTML=window.location.protocol;
    //setup term
            // t=termClient.Terminal("term","localhost",8180);
            // document.onkeypress=t.keypress;
            // document.onkeydown=function(){
                // t.keydown();
            // };
            // document.onkeyup=t.keyup;
};

MainAssistant.prototype.serviceSuccess = function(successData){
    var str=successData["html"]
    if(typeof successData!="undefined"){
        this.logInfo(str);
   }else {
        this.logInfo(JSON.stringify(successData));
   }
}
MainAssistant.prototype.serviceFailure = function(failData){
    this.logInfo("Fail Data:" + JSON.stringify(failData));
}
 
MainAssistant.prototype.deactivate = function(event) {};
 
MainAssistant.prototype.cleanup = function(event) {

};
 
MainAssistant.prototype.logInfo = function(logText) {
    this.debugContainer.innerHTML = logText;       
};    