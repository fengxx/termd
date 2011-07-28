enyo.kind({
	name: "App",
	kind:"VFlexBox",
	components: [
    	{kind:"Toolbar", className:"enyo-toolbar-light", pack:"center", components: [
			{kind: "Image", src: "icon.png"},
			{kind: "Control", content: "Terminal"}
		]},
       {kind:"Control", style:"width:500px; margin:23px auto 0;" , 
          components: [
            {kind: "RowGroup",
                components: [
                {kind: "Item", tapHighlight: false, layoutKind: "HFlexLayout", 
                        components: [
                            {flex:1, content: "Terminal Server"},
                            {kind: "ToggleButton", name:"termControl", state:false, onChange:"toggleService"}
                ]}	        	
            ]},
            {name: "console", kind: "HtmlContent", 
            style: "font-size: 10pt;"}
         ]
       },
        {kind: "enyo.PalmService", service: "palm://com.fengxx.term.service", 
            method: "runshell", subscribe: true, onSuccess: "status", 
            onFailure: "fail"
        }
	],
    timestamp:0,
    url:"",
    toggleService:function(inSender, inEvent) {
        if(inSender.getState()){
            var request = this.$.palmService.call();
        }else{
            this.closeService();
        }		
	},
	closeService: function() {
        //ajax call the stop function
        if(!this.url){
            this.url="http://localhost:50530";
        }
        enyo.xhrGet({
            url: this.url+"/admin/stop",
            load:function(){
                this.$.palmService.cancel();
                this.$.console.setContent("Service Stopped<br/>");
                this.setServiceStopped(true);
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
            setTimeout(enyo.bind(this, "checkAlive"), 300);
        }
        if(inResponse.heartbeat){
            this.timestamp=inResponse.heartbeat;
        }
	},
	fail: function(inSender, inResponse) {
		this.$.console.setContent(enyo.json.stringify(inResponse) + "<br/>");
	},
    checkAlive: function(){
        if(!this.$.termControl.state){
            return;
        }
        var t=Number(new Date());
        //this.$.console.setContent("timestamp: "+this.timestamp +" url: "+this.url);
        //2 minutes
        if(this.timestamp && t-this.timestamp> 120000){
            this.$.console.setContent(">no response in 2 minutes<br/>");
            //cancel request
            this.$.palmService.cancel();
            //
            this.$.termControl.setState(false);
        }else{
            setTimeout(enyo.bind(this, "checkAlive"), 25000);
        }
    }
    });
