enyo.kind({
	name: "App",
	kind:"VFlexBox",
	components: [
	    {name: "view", kind: "WebView" , style: "height: 100%; width:100%"},
		{name: "console", kind: "HtmlContent", 
            style: "font-size: 10pt;"},
        {kind: "enyo.PalmService", service: "palm://com.fengxx.term.service", 
            method: "runshell", subscribe: true, onSuccess: "status", 
            onFailure: "fail"
        },
		{kind: "ApplicationEvents", onUnload: "unloadHandler", onLoad:"onloadHandler"},
		{name: "popupFade", kind: "Popup", showHideMode: "transition", openClassName: "fadeIn", 
			className: "fadedOut", components: [
			{content: "Tap to activate the application"},
		]},
	],
    timestamp:0,
    url:"",
    onloadHandler: function() {
		var request = this.$.palmService.call();
		this.$.popupFade.openAtCenter();
		setTimeout(enyo.bind(this, "closePopup"), 2000);
		this.$.view.forceFocusEnableKeyboard();
	},
	closePopup: function(){
		this.$.popupFade.close();
	},
	unloadHandler: function (e) {
		// Destroy component tree on window unload, so we can rely on destructors for cleanup.
		 //ajax call the stop function
        if(!this.url){
            this.url="http://localhost:50530";
        }		
        enyo.xhrGet({
            url: this.url+"/admin/stop",
            load:function(){}
        });
	},
	status: function(inSender, inResponse) {
        if(inResponse.url){
            //enyo.windows.openWindow(inResponse.url);
            //window.location = inResponse.url;
            this.url=inResponse.url;
            //window.open(inResponse.url, "_blank","location=0,status=0,scrollbars=1");
			this.$.view.setUrl(this.url);
			//enyo.keyboard.forceShow(0);
			//enyo.keyboard.scrollIntoView();
        }
	},
	fail: function(inSender, inResponse) {
		this.$.console.setContent(enyo.json.stringify(inResponse) + "<br/>");
	}
    });
