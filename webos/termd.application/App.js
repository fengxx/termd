enyo.kind({
	name: "App",
	kind: enyo.VFlexBox,
	components: [
		{kind: "enyo.PalmService", service: "palm://com.fengxx.term.service", method: "runshell", subscribe: true, onSuccess: "status", onFailure: "fail"},
		{kind: "HFlexBox", components: [
			{name:"startbtn", kind: "Button", caption: "Start Service", onclick: "go"},
			{name:"stopbtn", kind: "Button", caption: "Stop Service", onclick: "cancel","disabled":true}
		]},
		{flex: 1, kind: "Scroller", style: "background-color: gray;", components: [
			{components: [
				{name: "console", kind: "HtmlContent", style: "font-size: 10pt; background-color: white;"}
			]}
		]}
	],
	go: function() {
		var request = this.$.palmService.call();
	},
	cancel: function() {
        //ajax call the stop function
        var self=this;
        enyo.xhrGet({
            url: self.url+"/admin/stop",
            load:function(){
                self.$.palmService.cancel();
                self.$.console.setContent("> cancelled<br/>");
                self.setServiceStopped(true);
                }
        });
	},
	status: function(inSender, inResponse) {
        if(inResponse.url){
            //enyo.windows.openWindow(inResponse.url);
            //window.location = inResponse.url;
            this.url=inResponse.url;
            window.open(inResponse.url, "_blank","location=0,status=0,scrollbars=1");
            this.$.console.setContent( "<a href='"+inResponse.url+"' onclick='window.open(this.href)'> Open Terminal </a>");
            this.setServiceStopped(false);
            setTimeout(enyo.bind(this, "checkAlive"), 300);
        }
        if(inResponse.heartbeat){
            this.timestamp=inResponse.heartbeat;
            //this.$.console.addContent(timestamp + "<br/>");
        }
	},
	fail: function(inSender, inResponse) {
		this.$.console.addContent(enyo.json.stringify(inResponse) + "<br/>");
	},
    checkAlive: function(){
        var t=Number(new Date());
        console.log("t:"+t +" live:"+this.timestamp);
        //2 minutes
        if(this.timestamp && t-this.timestamp> 120000){
            this.$.console.setContent(">no response<br/>");
            //cancel request
            this.$.palmService.cancel();
            this.setServiceStopped(true);
        }else{
            setTimeout(enyo.bind(this, "checkAlive"), 25000);
        }
    },
    setServiceStopped: function(flag){
            this.$.stopbtn.disabled=flag;
            this.$.startbtn.disabled=!flag;
            this.$.stopbtn.disabledChanged();
            this.$.startbtn.disabledChanged();
    }
});
