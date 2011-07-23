enyo.kind({
	name: "App",
	kind: enyo.VFlexBox,
	components: [
		{kind: "enyo.PalmService", service: "palm://com.fengxx.term.service", method: "runshell", subscribe: true, onSuccess: "status", onFailure: "fail"},
		{kind: "HFlexBox", components: [
			{name:"startbtn", kind: "Button", caption: "Start Service", onclick: "go"},
			{name:"stopbtn", kind: "Button", caption: "Stop Service", onclick: "cancel"}
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
		this.$.palmService.cancel();
		this.$.console.setContent("> cancelled<br/>");
	},
	status: function(inSender, inResponse) {
        if(inResponse.url){
            //enyo.windows.openWindow(inResponse.url);
            //window.location = inResponse.url;
            window.open(inResponse.url, "_blank","location=0,status=0,scrollbars=1");
            this.$.console.setContent( "<a href='"+inResponse.url+"'> Open Terminal </a>");
            //disable the start button
            //this.$.stopbtn.disabled=false;
            //this.$.startbtn.disabled=true;
        }
        if(inResponse.heartbeat){
            this.timestamp=inResponse.heartbeat;
        }
        //window.location = inResponse.url;
		//this.$.console.setContent( "<a href='"+inResponse.url+"'> Open Terminal </a>");
	},
	fail: function(inSender, inResponse) {
		this.$.console.addContent(enyo.json.stringify(inResponse) + "<br/>");
	}
});
