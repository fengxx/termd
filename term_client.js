var termClient={};
//see also http://www.w3.org/TR/2001/WD-DOM-Level-3-Events-20010410/DOM3-Events.html#events-Events-KeyEvent
//https://developer.mozilla.org/en/DOM/Event/UIEvent/KeyEvent
var specialKeys={
			8: "backspace", 9: "tab", 13: "return", 19: "pause",
			20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
			37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 47: "help",
			96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
			104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/", 
			112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8", 
			120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
};
termClient.Terminal=function(divid,status_id,host,port){
    return new this.TermObj(divid,status_id,host,port);
}
termClient.TermObj=function(divid,status_id,host,port){
    var self=this;
    var keybuf=[];
    var socket,stimeout;
    var sending=0;
    var specialKeyFired=null;
    var status_line=document.getElementById(status_id);
    var dterm=document.getElementById(divid);
    var speicalKeyInkeydown=0;
    function init() {
        setupSocket(host,port);
        stimeout=window.setTimeout(update,100);
        //check version
        if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1){
            speicalKeyInkeydown=1;
        }
    }
    function message(obj){
        if ('message' in obj)  {
            status_line.innerHTML = '<b>' + (obj.message[0]) + '</b> ';
        }
    }
      
    function setupSocket(host,port){
        //check if in local debug
        console.log(window.location.protocol +" host is "+host);
        if(typeof host=="undefined" && window.location.protocol=="file:"){
            console.log("not run on server,local debug")
           //disable send
           sending=1;
           return;
        }
        if(typeof host !="undefined" && typeof port!="undefined" ){
            socket = new io.Socket(host, {
                "rememberTransport": false,
                "port":port
            });
            console.log("setup socket for "+host +" port:"+port);
        }else {
            socket = new io.Socket(null, {
                rememberTransport: false
            });
        }
        socket.connect();
        socket.on('message', function(obj){
            if('term' in obj){
                //console.log(obj.term);
                dterm.innerHTML=obj.term;
            }
        });
        
        socket.on('connect', function(){
            console.log("ready");
           message({
                message: ['Connected']
            })
        }
        );
        socket.on('disconnect', function(){
            message({
                message: ['Disconnected']
            })
            //clear screen
            dterm.innerText="Session closed";
        });
        socket.on('reconnect', function(){
            message({
                message: ['Reconnected to server']
            })
        });
        socket.on('reconnecting', function( nextRetry ){
            message({
                message: ['Attempting to re-connect to the server, next attempt in ' + nextRetry + 'ms']
            })
        });
        socket.on('reconnect_failed', function(){
            message({
                message: ['Reconnected to server FAILED.']
            })
        });
    }
    this.queue=function(s){
        console.log(s);
        if(typeof(s)=='undefined' ||s.length==0){
            return;
        }       
        keybuf.unshift(s);
        if(sending==0) {
            window.clearTimeout(stimeout);
            stimeout=window.setTimeout(update,1);
        }
    }    
    function update() {
        if(sending==0) {
            sending=1;
            var keyTyped="";
            while(keybuf.length>0) {
                keyTyped+=keybuf.pop();
            }
            if(keyTyped.length>0){
                socket.send(keyTyped);
            }
            sending=0;
        }        
    }
    /** Below is from putty document
 In the default mode, labelled ESC [n~, the function keys generate sequences like ESC [11~, ESC [12~ and so on. This matches the general behaviour of Digital's terminals. 
 In Linux mode, F6 to F12 behave just like the default mode, but F1 to F5 generate ESC [[A through to ESC [[E. This mimics the Linux virtual console. 
*/ 
	this.keypress=function(ev) {
		if (!ev) var ev=window.event;
        // Add which for key events
        if ( ev.which == null && (ev.charCode != null || ev.keyCode != null) ) {
            ev.which = ev.charCode != null ? ev.charCode : ev.keyCode;
        }
		var kc=ev.which,k="";
		if (ev.altKey) { //alt key
			if (kc>=65 && kc<=90)
				kc+=32;
			if (kc>=97 && kc<=122) {
				k=String.fromCharCode(27)+String.fromCharCode(kc);
			}
		} else if (ev.ctrlKey) { //ctrlKey
			if (kc>=65 && kc<=90) k=String.fromCharCode(kc-64); // Ctrl-A..Z
			else if (kc>=97 && kc<=122) k=String.fromCharCode(kc-96); // Ctrl-A..Z
			else if (kc==54)  k=String.fromCharCode(30); // Ctrl-^
			else if (kc==109) k=String.fromCharCode(31); // Ctrl-_
			else if (kc==219) k=String.fromCharCode(27); // Ctrl-[
			else if (kc==220) k=String.fromCharCode(28); // Ctrl-\
			else if (kc==221) k=String.fromCharCode(29); // Ctrl-]
			else if (kc==219) k=String.fromCharCode(29); // Ctrl-]
			else if (kc==219) k=String.fromCharCode(0);  // Ctrl-@
		} else{
			if (kc==8) k=String.fromCharCode(127);  // Backspace to delete	
			else if(isSpecialKey(ev)) { //special keys
                if(kc==13) k=String.fromCharCode(10); //CR to LF,in unix system move to new line and all way to left
                else if(kc< 33){
                    k=String.fromCharCode(kc);
                }
				if (kc==33) k="[5~";        // PgUp
				else if (kc==34) k="[6~";   // PgDn
				else if (kc==35) k="[4~";   // End
				else if (kc==36) k="[1~";   // Home
				else if (kc==37) k="[D";    // Left
				else if (kc==38) k="[A";    // Up
				else if (kc==39) k="[C";    // Right
				else if (kc==40) k="[B";    // Down
				else if (kc==45) k="[2~";   // Ins
				else if (kc==46) k="[3~";   // Del
				else if (kc==112) k="[[A";  // F1
				else if (kc==113) k="[[B";  // F2
				else if (kc==114) k="[[C";  // F3
				else if (kc==115) k="[[D";  // F4
				else if (kc==116) k="[[E";  // F5
				else if (kc==117) k="[17~"; // F6
				else if (kc==118) k="[18~"; // F7
				else if (kc==119) k="[19~"; // F8
				else if (kc==120) k="[20~"; // F9
				else if (kc==121) k="[21~"; // F10
				else if (kc==122) k="[23~"; // F11
				else if (kc==123) k="[24~"; // F12
                else if (kc==191 && ev.shiftKey) k="?";
				if (k.length>=2) {
					k=String.fromCharCode(27)+k;
				}else if (k.length==0 && typeof specialKeys[kc] !="undefined" && specialKeys[kc].length==1){
                     //console.log("key code is "+kc);
                    //all the others k=specialKeys[kc]; from DOM_VK_NUMPAD0 to DOM_VK_DIVIDE and /
                    k=specialKeys[kc];
                }
			}else{
                    k=String.fromCharCode(kc);
            }
		}
		self.queue(escape(k));		
		ev.cancelBubble=true;
		if (ev.stopPropagation) ev.stopPropagation();
		if (ev.preventDefault)  ev.preventDefault();
		return false;
	}
    //JavaScript Madness: Keyboard Events http://unixpapa.com/js/key.html
    this.keydown = function(ev){
        ev=eventFix(ev);     
        if ( isSpecialKey(ev) && (specialKeyFired!=ev.which || specialKeyFired==null)) {
                //only allow autorepeat for delete/backspace
                if(ev.which!=8 && ev.which !=46){
                    specialKeyFired=ev.which;
                }
                //allow copy by ctrl+insert
                if(ev.which==45 && ev.ctrlKey){
                    return false;
                }
                //console.log("keydown delegate to keypress");        
				return this.keypress(ev);
		}
        return false;
    }
    
    this.keyup=function(ev){
        if (isSpecialKey(ev)) {
            //release flag
             specialKeyFired=null;  
		}
        return false;
    }
    this.close=function(){
        socket.close();
    }
    function isSpecialKey(ev){
        //event.charCode undefined or zero in keydown and keyup events
        if ((typeof event.charCode =="undefined" || event.charCode==0 ) 
            &&  specialKeys[ev.which]) {
            return true;
		}else if(ev.ctrlKey || ev.altKey){
            return true;
        }
        else{
            return false;
        }
    }
    
    function eventFix(ev){
        if (!ev) var ev=window.event;
        if ( ev.which == null && (ev.charCode != null || ev.keyCode != null) ) {
            ev.which = ev.charCode != null ? ev.charCode : ev.keyCode;
        }
        return ev;
    }
    init();
}