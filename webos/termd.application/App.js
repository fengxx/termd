/* Copyright 2009-2011 Hewlett-Packard Development Company, L.P. All rights reserved. */
enyo.kind({
	name: "App",
	kind: enyo.VFlexBox,
	components: [
		{kind: "enyo.PalmService", service: "palm://com.fengxx.term.service", method: "runshell", subscribe: true, onSuccess: "status", onFailure: "fail"},
		{kind: "HFlexBox", components: [
			{kind: "Button", caption: "Connect Service", onclick: "go"},
			{kind: "Button", caption: "Cancel Service", onclick: "cancel"}
		]},
		{flex: 1, kind: "Scroller", style: "background-color: gray;", components: [
			{components: [
				{name: "console", kind: "HtmlContent", style: "font-size: 10pt; background-color: white;"}
			]}
		]}
	],
	go: function() {
		var request = this.$.palmService.call();
        if(request.json.html) {
            this.$.console.setContent( "<a name ='open it' src='"+request.json.html+"'>");
         }
	},
	cancel: function() {
		this.$.palmService.cancel();
		this.$.console.addContent("> cancelled<br/>");
	},
	status: function(inSender, inResponse) {
        // this.controller.serviceRequest('palm://com.palm.applicationManager', {
            // method: 'open',
            // parameters: { target: inResponse.html }
        // });
        window.location = inResponse.html;
		this.$.console.setContent( "<a href='"+inResponse.html+"'> Open Terminal </a>");
	},
	fail: function(inSender, inResponse) {
		this.$.console.addContent(enyo.json.stringify(inResponse) + "<br/>");
	}
});
