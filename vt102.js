//Author fengxx
//reference 
//http://search.cpan.org/~ajwood/Term-VT102-0.91/VT102.pm
//http://vt100.net/docs/vt100-ug/contents.html
//http://vt100.net/docs/vt102-ug/contents.html
//http://en.wikipedia.org/wiki/C0_and_C1_control_codes
//http://en.wikipedia.org/wiki/ANSI_escape_code
var DEFAULT_ATTR=263; //white on black
var NULL_CHAR_CODE=0;

exports.TermAttribute = TermAttribute;
exports.CreateAttribute = function (num) {
    return new TermAttribute(num);
};

String.prototype.endsWith = function (s) {
  return this.length >= s.length && this.substr(this.length - s.length) == s;
}

Array.prototype.batchUpdate=function(start_pos,length,_str){
    var self=this;
   for(var i=start_pos;i-start_pos<length && i<self.length;i++){
        self[i]=_str;
   }
}

function TermAttribute(num){
    /**foreground text colours (black,red,green,yellow,blue,magenta,cyan,
        white,reserved 9 colors) from 0 to 9 took 4bit, background text colours also took 4bit ,bold 1 bit ,
        faint 1 bit, underline 1 bit, blink 1bit and reverse 1bit
     */	
    //order is foreground color (fg), background color(bg), bold, faint,underline,blink, reverse
    var self=this;
    self.fg= num & 15;
    self.bg=(num >> 4) & 15;
    self.bold=(num >> 8) & 1;
    self.faint=(num >> 9) & 1;
    self.underline=(num >> 10) & 1;
    self.blink=(num >> 11) & 1;
    self.reverse=(num >> 12) & 1;
}

TermAttribute.prototype.packAttr=function(){
    var self=this;
    var sgr_attr=(self.fg & 15)
    | ((self.bg & 15) << 4)
    | (self.bold << 8)
    | (self.faint << 9)
    | (self.underline << 10)
    | (self.blink << 11)
    | (self.reverse << 12)
    return sgr_attr;
}

function toHex(n) {
    if (n < 16) return '0' + n.toString(16);
    return n.toString(16);
}

var Terminal = exports.Terminal = function(height,width,output){
    this.version="v0.1";
    this.cols=width;
    this.rows=height;
    this.output=output;
    this._tabstops={};
    this.reset=function(){
        this.x=this.y=0; //start with zero
        //set attribute
        this.attrObj= new TermAttribute(DEFAULT_ATTR);
        this.attr=DEFAULT_ATTR;
        this.ti=""; //title
        this.ic=""; //icon
        this._scrolltop=0; //scrolling region top: row 1
        this._scrollbottom=this.rows-1; //scrolling region bottom
        this.opts={
            LINEWRAP:1,
            LFTOCRLF:0,
            IGNOREXOFF:1
        };
        this.scrt=new Array(); //blank screen text
        this.scra=new Array(); //blank screen attributes

        //set default screen
        for(var i=0;i<this.cols*this.rows;i++){
            this.scrt[i]=NULL_CHAR_CODE;  
            this.scra[i]=DEFAULT_ATTR;
        }
        //reset tab stops        
        for(var i=0;i<this.cols;i+=8){
            this._tabstops[i]=1;
        }
        this._inesc="";
        this._xon=1; //state is XON (chars accepted)
        this.cursor=1; //turn cursor on
        this._escbuf=null; //no esc in buffer
    }
    this.reset();
}

Terminal.prototype.call_output=function(str){
     if(typeof this.output !="undefined" &&  typeof this.output["write"] == "function"){
        this.output.write(str);
     }
    }

Terminal.prototype._ctlseq   = {       // control characters
    "\x00" : 'NUL',            // ignored
    "\x05" : 'ENQ',            // trigger answerback message
    "\x07" : 'BEL',            // beep
    "\x08" : 'BS',             // backspace one column
    "\x09" : 'HT',             // horizontal tab to next tab stop
    "\x0A" : 'LF',             // line feed
    "\x0B" : 'VT',             // line feed
    "\x0D" : 'FF',             // line feed
    "\x0D" : 'CR',             // carriage return
    "\x0E" : 'SO',             // activate G1 character set & newline
    "\x0F" : 'SI',             // activate G0 character set
    "\x11" : 'XON',            // resume transmission
    "\x13" : 'XOFF',           // stop transmission, ignore characters
    "\x18" : 'CAN',            // interrupt escape sequence
    "\x1A" : 'SUB',            // interrupt escape sequence
    "\x1B" : 'ESC',            // start escape sequence
    "\x7F" : 'DEL',            // ignored
    "\x9B" : 'CSI'             // equivalent to ESC [
};

Terminal.prototype._escseq   = {   // escape sequences
    'c' : 'RIS',              // reset
    'D' : 'IND',              // line feed
    'E' : 'NEL',              // newline
    'H' : 'HTS',              // set tab stop at current column
    'M' : 'RI',               // reverse line feed
    'Z' : 'DECID',            // DEC private ID; return ESC [ ? 6 c (VT102)
    '7' : 'DECSC',            // save state (position, charset, attributes)
    '8' : 'DECRC',            // restore most recently saved state
    '[' : 'CSI',              // control sequence introducer
    '[[' : 'IGN',              // ignored control sequence
    '%@' : 'CSDFL',            // select default charset (ISO646/8859-1)
    '%G' : 'CSUTF8',           // select UTF-8
    '%8' : 'CSUTF8',           // select UTF-8 (obsolete)
    '#8' : 'DECALN',           // DEC alignment test - fill screen with E's
    '(8' : 'G0DFL',            // G0 charset = default mapping (ISO8859-1)
    '(0' : 'G0GFX',            // G0 charset = VT100 graphics mapping
    '(U' : 'G0ROM',            // G0 charset = null mapping (straight to ROM)
    '(K' : 'G0USR',            // G0 charset = user defined mapping
    '(B' : 'G0TXT',            // G0 charset = ASCII mapping
    ')8' : 'G1DFL',            // G1 charset = default mapping (ISO8859-1)
    ')0' : 'G1GFX',            // G1 charset = VT100 graphics mapping
    ')U' : 'G1ROM',            // G1 charset = null mapping (straight to ROM)
    ')K' : 'G1USR',            // G1 charset = user defined mapping
    ')B' : 'G1TXT',            // G1 charset = ASCII mapping
    '*8' : 'G2DFL',            // G2 charset = default mapping (ISO8859-1)
    '*0' : 'G2GFX',            // G2 charset = VT100 graphics mapping
    '*U' : 'G2ROM',            // G2 charset = null mapping (straight to ROM)
    '*K' : 'G2USR',            // G2 charset = user defined mapping
    '+8' : 'G3DFL',            // G3 charset = default mapping (ISO8859-1)
    '+0' : 'G3GFX',            // G3 charset = VT100 graphics mapping
    '+U' : 'G3ROM',            // G3 charset = null mapping (straight to ROM)
    '+K' : 'G3USR',            // G3 charset = user defined mapping
    '>' : 'DECPNM',           // set numeric keypad mode
    '=' : 'DECPAM',           // set application keypad mode
    'N' : 'SS2',              // select G2 charset for next char only
    'O' : 'SS3',              // select G3 charset for next char only
    'P' : 'DCS',              // device control string (ended by ST)
    'X' : 'SOS',              // start of string
    '^' : 'PM',               // privacy message (ended by ST)
    '_' : 'APC',              // application program command (ended by ST)
    "\\" : 'ST',               // string terminator
    'n' : 'LS2',              // invoke G2 charset
    'o' : 'LS3',              // invoke G3 charset
    '|' : 'LS3R',             // invoke G3 charset as GR
    '}' : 'LS2R',             // invoke G2 charset as GR
    '~' : 'LS1R',             // invoke G1 charset as GR
    ']' : 'OSC',              // operating system command
    'g' : 'BEL',              // alternate BEL
    '#3': 'DECDHL',           //Double-height top half 
    '#4': 'DECDHL',           //Double-height bottom half
    '#5': 'DECSWL',           //Single-width single-height
    '#6': 'DECDWL'            //Double-width single-height
};

Terminal.prototype._csiseq   = {  // ECMA-48 CSI sequences
    '[' : 'IGN',               // ignored control sequence
    '@' : 'ICH',               // insert blank characters
    'A' : 'CUU',               // move cursor up
    'B' : 'CUD',               // move cursor down
    'C' : 'CUF',               // move cursor right
    'D' : 'CUB',               // move cursor left
    'E' : 'CNL',               // move cursor down and to column 1
    'F' : 'CPL',               // move cursor up and to column 1
    'G' : 'CHA',               // move cursor to column in current row
    'H' : 'CUP',               // move cursor to row, column
    'J' : 'ED',                // erase display
    'K' : 'EL',                // erase line
    'L' : 'IL',                // insert blank lines
    'M' : 'DL',                // delete lines
    'P' : 'DCH',               // delete characters on current line
    'X' : 'ECH',               // erase characters on current line
    'a' : 'HPR',               // move cursor right
    'c' : 'DA',                // Device attributes (what are you) return ESC [ ? 6 c (VT102)
    'd' : 'VPA',               // move to row (current column)
    'e' : 'VPR',               // move cursor down
    'f' : 'HVP',               // move cursor to row, column
    'g' : 'TBC',               // clear tab stop (CSI 3 g = clear all stops)
    'h' : 'SM',                // set mode
    'l' : 'RM',                // reset mode
    'm' : 'SGR',               // set graphic rendition
    'n' : 'DSR',               // device status report
    'q' : 'DECLL',             // set keyboard LEDs
    'r' : 'DECSTBM',           // set scrolling region to (top, bottom) rows
    's' : 'CUPSV',             // save cursor position
    'u' : 'CUPRS',             // restore cursor position
    '`' : 'HPA'                // move cursor to column in current row
};
//http://vt100.net/docs/vt100-ug/chapter3.html
/*sample
                        To Set                      To Reset
Mode Name               Mode        Sequence        Mode        Sequence
Line feed/new line      New line    ESC [20h        Line feed   ESC [20l*
Cursor key mode         Application ESC [?1h        Cursor      ESC [?1l*
ANSI/VT52 mode          ANSI        N/A             VT52        ESC [?2l*
Column mode             132 Col     ESC [?3h        80 Col      ESC [?3l*
Scrolling mode          Smooth      ESC [?4h        Jump        ESC [?4l*
Screen mode             Reverse     ESC [?5h        Normal      ESC [?5l*
Origin mode             Relative    ESC [?6h        Absolute    ESC [?6l*
Wraparound              On          ESC [?7h        Off         ESC [?7l*
Auto repeat             On          ESC [?8h        Off         ESC [?8l*
Interlace               On          ESC [?9h        Off         ESC [?9l*
Keypad mode             Application ESC =           Numeric     ESC >

The last character of the sequence is a lowercase L (1548).
*/
Terminal.prototype._modeseq   = { 
    // ANSI/DEC specified modes for SM/RM    
    // ANSI Specified Modes
    '0'   : 'IGN',           // Error (Ignored)
    '1'   : 'GATM',          // guarded-area transfer mode (ignored)
    '2'   : 'KAM',           // keyboard action mode (always reset)
    '3'   : 'CRM',           // control representation mode (always reset)
    '4'   : 'IRM',           // insertion/replacement mode (always reset)
    '5'   : 'SRTM',          // status-reporting transfer mode
    '6'   : 'ERM',           // erasure mode (always set)
    '7'   : 'VEM',           // vertical editing mode (ignored)
    '10'   : 'HEM',           // horizontal editing mode
    '11'   : 'PUM',           // positioning unit mode
    '12'   : 'SRM',           // send/receive mode (echo on/off)
    '13'   : 'FEAM',          // format effector action mode
    '14'   : 'FETM',          // format effector transfer mode
    '15'   : 'MATM',          // multiple area transfer mode
    '16'   : 'TTM',           // transfer termination mode
    '17'   : 'SATM',          // selected area transfer mode
    '18'   : 'TSM',           // tabulation stop mode
    '19'   : 'EBM',           // editing boundary mode
    '20'   : 'LNM',           // Line Feed / New Line Mode
    // DEC Private Modes, can be viewed online http://vt100.net/docs/vt510-rm/DECTCEM(change the code here)
    '?0'   : 'IGN',           // Error (Ignored)
    '?1'   : 'DECCKM',        // Cursorkeys application (set); Cursorkeys normal (reset)
    '?2'   : 'DECANM',        // ANSI (set); VT52 (reset)
    '?3'   : 'DECCOLM',       // 132 columns (set); 80 columns (reset)
    '?4'   : 'DECSCLM',       // Jump scroll (set); Smooth scroll (reset)
    '?5'   : 'DECSCNM',       // Reverse screen (set); Normal screen (reset)
    '?6'   : 'DECOM',         // Sets relative coordinates (set); Sets absolute coordinates (reset)
    '?7'   : 'DECAWM',        // Auto Wrap
    '?8'   : 'DECARM',        // Auto Repeat
    '?9'   : 'DECINLM',       // Interlace
    '?18'   : 'DECPFF',        // Send FF to printer after print screen (set); No char after PS (reset)
    '?19'   : 'DECPEX',        // Print screen: prints full screen (set); prints scroll region (reset)
    '?25'   : 'DECTCEM'       // Cursor on (set); Cursor off (reset)
};

Terminal.prototype._funcs   = {     // supported character sequences
    'BS' : "_code_BS",    // backspace one column
    'CR'   : "_code_CR",    // carriage return
    'DA'   : "_code_DA",    // return ESC [ ? 6 c (VT102)
    'DL'   : "_code_DL",    // delete lines
    'ED'   : "_code_ED",    // erase display
    'EL'   : "_code_EL",    // erase line
    'FF'   : "_code_LF",    // line feed
    'HT'   : "_code_HT",    // horizontal tab to next tab stop
    'IL'   : "_code_IL",    // insert blank lines
    'LF'   : "_code_LF",    // line feed
    'PM'   : "_code_PM",    // privacy message (ended by ST)
    'RI'   : "_code_RI",    // reverse line feed
    'RM'   : "_code_RM",    // reset mode
    'SI' : undefined,     // activate G0 character set 
    'SM'   : "_code_SM",    // set mode
    'SO' : undefined,         // activate G1 character set & CR
    'ST' : undefined,         // string terminator
    'VT'   : "_code_LF",    // line feed
    'APC'   : "_code_APC",    // application program command (ended by ST)
    'BEL'   : "_code_BEL",    // beep
    'CAN'   : "_code_CAN",    // interrupt escape sequence
    'CHA'   : "_code_CHA",    // move cursor to column in current row
    'CNL'   : "_code_CNL",    // move cursor down and to column 1
    'CPL'   : "_code_CPL",    // move cursor up and to column 1
    'CRM' : undefined,         // control representation mode
    'CSI'   : "_code_CSI",    // equivalent to ESC [
    'CUB'   : "_code_CUB",    // move cursor left
    'CUD'   : "_code_CUD",    // move cursor down
    'CUF'   : "_code_CUF",    // move cursor right
    'CUP'   : "_code_CUP",    // move cursor to row, column
    'CUU'   : "_code_CUU",    // move cursor up
    'DCH'   : "_code_DCH",    // delete characters on current line
    'DCS'   : "_code_DCS",    // device control string (ended by ST)
    'DEL' : undefined,   // ignored
    'DSR'   : "_code_DSR",    // device status report
    'EBM' : undefined,         // editing boundary mode
    'ECH'   : "_code_ECH",    // erase characters on current line
    'ENQ' : undefined,         // trigger answerback message
    'ERM' : undefined,         // erasure mode
    'ESC'   : "_code_ESC",    // start escape sequence
    'HEM' : undefined,         // horizontal editing mode
    'HPA'   : "_code_CHA",    // move cursor to column in current row
    'HPR'   : "_code_CUF",    // move cursor right
    'HTS'   : "_code_HTS",    // set tab stop at current column
    'HVP'   : "_code_CUP",    // move cursor to row, column
    'ICH'   : "_code_ICH",    // insert blank characters
    'IGN'   : "_code_IGN",    // ignored control sequence
    'IND'   : "_code_LF",    // line feed
    'IRM' : undefined,         // insert/replace mode
    'KAM' : undefined,         // keyboard action mode
    'LNM' : undefined,         // line feed / newline mode
    'LS2' : undefined,         // invoke G2 charset
    'LS3' : undefined,         // invoke G3 charset
    'NEL'   : "_code_NEL",    // newline
    'NUL'   : "_code_IGN",    // ignored
    'OSC'   : "_code_OSC",    // operating system command
    'PUM' : undefined,         // positioning unit mode
    'RIS'   : "_code_RIS",    // reset
    'SGR'   : "_code_SGR",    // set graphic rendition
    'SOS' : undefined,         // start of string
    'SRM' : undefined,         // send/receive mode (echo on/off)
    'SS2' : undefined,         // select G2 charset for next char only
    'SS3' : undefined,         // select G3 charset for next char only
    'SUB'   : "_code_CAN",    // interrupt escape sequence
    'TBC'   : "_code_TBC",    // clear tab stop (CSI 3 g = clear all stops)
    'TSM' : undefined,         // tabulation stop mode
    'TTM' : undefined,         // transfer termination mode
    'VEM' : undefined,         // vertical editing mode
    'VPA'   : "_code_VPA",    // move to row (current column)
    'VPR'   : "_code_CUD",    // move cursor down
    'XON'   : "_code_XON",    // resume transmission
    'FEAM' : undefined,         // format effector action mode
    'FETM' : undefined,         // format effector transfer mode
    'GATM' : undefined,         // guarded-area transfer mode
    'LS1R' : undefined,         // invoke G1 charset as GR
    'LS2R' : undefined,         // invoke G2 charset as GR
    'LS3R' : undefined,         // invoke G3 charset as GR
    'MATM' : undefined,         // multiple area transfer mode
    'SATM' : undefined,         // selected area transfer mode
    'SRTM' : undefined,         // status-reporting transfer mode
    'XOFF'   : "_code_XOFF",         // stop transmission, ignore characters
    'CSDFL' : undefined,         // select default charset (ISO646/8859-1)
    'CUPRS'   : "_code_CUPRS",         // restore cursor position
    'CUPSV'   : "_code_CUPSV",         // save cursor position
    'DECID'   : "_code_DA",         // DEC private ID; return ESC [ ? 6 c (VT102)
    'DECLL' : undefined,         // set keyboard LEDs
    'DECOM' : undefined,         // relative/absolute coordinate mode
    'DECRC'   : "_code_DECRC",         // restore most recently saved state
    'DECSC'   : "_code_DECSC",         // save state (position, charset, attributes)
    'G0DFL' : undefined,         // G0 charset = default mapping (ISO8859-1)
    'G0GFX' : undefined,         // G0 charset = VT100 graphics mapping
    'G0ROM' : undefined,         // G0 charset = null mapping (straight to ROM)
    'G0TXT' : undefined,         // G0 charset = ASCII mapping
    'G0USR' : undefined,         // G0 charset = user defined mapping
    'G1DFL' : undefined,         // G1 charset = default mapping (ISO8859-1)
    'G1GFX' : undefined,         // G1 charset = VT100 graphics mapping
    'G1ROM' : undefined,         // G1 charset = null mapping (straight to ROM)
    'G1TXT' : undefined,         // G1 charset = ASCII mapping
    'G1USR' : undefined,         // G1 charset = user defined mapping
    'G2DFL' : undefined,         // G2 charset = default mapping (ISO8859-1)
    'G2GFX' : undefined,         // G2 charset = VT100 graphics mapping
    'G2ROM' : undefined,         // G2 charset = null mapping (straight to ROM)
    'G2USR' : undefined,         // G2 charset = user defined mapping
    'G3DFL' : undefined,         // G3 charset = default mapping (ISO8859-1)
    'G3GFX' : undefined,         // G3 charset = VT100 graphics mapping
    'G3ROM' : undefined,         // G3 charset = null mapping (straight to ROM)
    'G3USR' : undefined,         // G3 charset = user defined mapping
    'CSUTF8' : undefined,         // select UTF-8 (obsolete)
    'DECALN'   : "_code_DECALN",  // DEC alignment test - fill screen with E's
    'DECANM' : undefined,         // ANSI/VT52 mode
    'DECARM' : undefined,         // auto repeat mode
    'DECAWM' : "_code_DECAWM",    // auto wrap mode
    'DECCKM' : undefined,         // cursor key mode
    'DECPAM' : undefined,         // set application keypad mode
    'DECPEX' : undefined,         // print screen / scrolling region
    'DECPFF' : undefined,         // sent FF after print screen, or not
    'DECPNM' : undefined,         // set numeric keypad mode
    'DECCOLM' : "_code_DECCOLM",         // 132 column mode
    'DECINLM' : undefined,         // interlace mode
    'DECSCLM' : undefined,         // jump/smooth scroll mode
    'DECSCNM' : undefined,         // reverse/normal screen mode
    'DECSTBM'   : "_code_DECSTBM", // set scrolling region
    'DECTCEM'   : "_code_DECTCEM",   // Cursor on (set); Cursor off (reset)
    'DECDHL'    : undefined,        //Double-height top half /bottom half(also double width)
    'DECSWL'    : undefined,        //Single-width single-height
    'DECDWL'    : undefined         //Double-width single-height
};
    
//Process the given string, updating the terminal object and calling any
Terminal.prototype.process=function(buf){
    //console.log(buf);
    for (var i = 0; i < buf.length ; i++) {
        var ch=buf[i];
        if(this._escbuf!=null){ //in the escape sequence
            var xstr=String.fromCharCode(ch)
            if(ch<= 0x1F){ //control
                this._process_ctl(xstr);
            }else{
                this._escbuf+=xstr;
                this._process_escseq();
            }
        }else{ //Not in the escape sequence             
            //check contains texts
            if(this.isText(ch)){
                this._process_text(ch);             
            }else
            {    
                this._process_ctl(String.fromCharCode(ch));
            }
        }
    }
}

Terminal.prototype.isText=function(ch){
    //9B CSI
    //7F DEL
    if(ch>0x1F && ch!=0x7F && ch!= 0x9B){
        return true;
    }else {
        return false;
    }
}
//Process a control character.
Terminal.prototype._process_ctl=function(ch){
    var name = this._ctlseq[ch];
    if(typeof name =='undefined' || (this._xon==0 && name !='XON')){
        return;
    }
    var func=this._funcs[name];
    if(typeof func !='undefined'){
        // if(func !="_code_ESC"){
            // console.log("ctrl:" +func);
         // }
        this[func].call(this,ch);
    }
}

Terminal.prototype._process_text=function(ch){
    if(this._xon==0){
        return;
    }
    //no line wrap - truncate
    if(this.x>=this.cols) {
        if(this.opts["LINEWRAP"]==0) {
            return;
        }else{
            //call CRLF ?? what if user deletes
            this._code_NEL();
        }
    }
    var idx=this.cols*this.y+this.x;
    this.scrt[idx]=ch;
    this.scra[idx]=this.attr;
    //debug
    //console.log("x:"+this.x+"y:"+this.y +"ch:" +String.fromCharCode(ch));
    this.x++;
}


Terminal.prototype._process_escseq=function(ch){
    //Check the escape-sequence buffer, and process it if necessary.
    if(this._escbuf==null || this._xon==0){
        return;
    }
    if(this._inesc=="OSC"){ //in OSC sequence
        var sresult=this._escbuf.match( /^(\d+);([^\x07]*)(?:\x07|\x21\\)/);
        if(sresult){
            this._escbuf=null;
            this._inesc="";
            //# icon & window
            if(sresult[0]==1){
                this.ic=sresult[1];
                this.ti=sresult[1];
            }else if(sresult[0]==1){ //set icon name
                this.ic=sresult[1];        
            }else if(sresult[0]==2){ //set window title
                this.ti=sresult[1];
            }
        }    
    }else if(this._inesc=='CSI') {
        for(var name in this._csiseq){
        //check if ends With name
            if(!this._escbuf.endsWith(name)){
                continue;
            }
            this._escbuf=this._escbuf.substr(0,this._escbuf.indexOf(name));
            var funcKey=this._csiseq[name];
            var func=this._funcs[funcKey];            
            if(typeof func !="undefined"){
                var funcArgs=this._escbuf.split(/;/);
                //console.log("buffer "+ this._escbuf+" name "+name+"  key "+ funcKey +" ->"+func+" arg:"+funcArgs +" length: "+ funcArgs.length +" x:"+this.x +" y:"+this.y);
                this[func].apply(this,funcArgs);
                this._escbuf=null;
                this._inesc="";
                return;
            }
        }
        //non implemented csi
        if(this._escbuf.length>64){
            this._escbuf=null;
            this._inesc="";            
        }
        
    }else if(this._inesc.match(/_ST$/)){
        this._escbuf=null;
        this._inesc="";        
    }else{
        //in ESC sequence
        for(var name in this._escseq){
            if(name.length >this._escbuf.length || this._escbuf.indexOf(name) !=0){
                continue;
            }
            var fname=this._escseq[name];
            var func=this._funcs[fname];
            //console.log("ESC "+name+" Control "+ fname+ " implement func "+func);
            this._escbuf=null;
            this._inesc="";
            if(typeof func !="undefined"){
                this[func].call(this);
            }
            return;
        }
        //other non implemented sequence
        if(this._escbuf.length>8){
            this._escbuf=null;
            this._inesc="";            
        }
    }
}

Terminal.prototype._scroll_content_up=function(p_top,p_bottom,lineNum){
    //move text up
    var n=Math.min(p_bottom-p_top,lineNum);
    var mvfrom=p_top*this.cols;
    var mvend=(p_bottom+1)*this.cols;
    for(var idx=mvfrom;idx<mvend;idx++){
        var srcIdx=idx+n*this.cols;
        if(srcIdx<mvend) {
            this.scrt[idx]=this.scrt[srcIdx];
            this.scra[idx]=this.scra[srcIdx];
        }else{
            this.scrt[idx]=NULL_CHAR_CODE;
            this.scra[idx]=DEFAULT_ATTR;
        }
    }
}

Terminal.prototype._scroll_content_down=function(p_top,p_bottom,lineNum){
    var n=Math.min(p_bottom-p_top,lineNum);
    //move text down
    var mvfrom=(p_bottom+1)*this.cols-1;
    var mvend=p_top*this.cols;
    for(var idx=mvfrom;idx>=mvend;idx--){
        var srcIdx=(idx-n)*this.cols;
        if(srcIdx>=mvend){
            this.scrt[idx]=this.scrt[srcIdx];
            this.scra[idx]=this.scra[srcIdx];
        }else{
            this.scrt[idx]=NULL_CHAR_CODE;
            this.scra[idx]=DEFAULT_ATTR;
        }
    }
}

Terminal.prototype._move_up=function(num){
    var pnum=getNumberValue(num, 1);
    this.y-=pnum;
    if(this.y>=this._scrolltop){
        return;
    }
    this._scroll_content_down(this._scrolltop,this._scrollbottom,this._scrolltop-this.y);
    this.y=this._scrolltop;    
}

Terminal.prototype._move_down=function(num){
    var pnum=getNumberValue(num, 1);
    this.y=this.y+pnum;    
    if(this.y<=this._scrollbottom){
        return;
    }
    var dx=this.y-this._scrollbottom;
    this.y=this._scrollbottom;
    this._scroll_content_up(this._scrolltop,this._scrollbottom,dx);    
}


Terminal.prototype._cursor_down=function(num){
    this.y=Math.min(this._scrollbottom, this.y+num);    
}

Terminal.prototype._cursor_up=function(num){
    this.y=Math.max(this._scrolltop, this.y-num);    
}

Terminal.prototype._code_BEL=function(){
    //CSI OSC can be terminated with a BEL
    if(this._escbuf!=null && this._inesc=='OSC'){
        this._escbuf+="\x07";
        this._process_escseq();        
    }
}

Terminal.prototype._code_BS=function(){
    //move left 1 character
    if(this.x>0){
        this.x-=1;
    }else{
        this.x=0;
    }
}

Terminal.prototype._code_CAN=function(){
    //cancel escape sequence
    this._inesc="";
    this._escbuf="";
}
Terminal.prototype._code_TBC=function(num){
    // clear tab stop (CSI 3 g = clear all stops)
    if(typeof num !="undefined" && num==3){
        this._tabstops=[];
    }else{
        this._tabstops[this.x]=undefined;
    }
}
Terminal.prototype._code_CHA=function(col){
    //move to column in current row
    col =getNumberValue(col, 1);
    var sx=col>=this.cols?this.cols-1: (col<0?0:col-1);
    this.x=sx;
}
Terminal.prototype._code_CNL=function(num){
    //move cursor down and to first column
    num =getNumberValue(num, 1);
    this.x=0;
    this._cursor_down(num);
}

Terminal.prototype._code_CPL=function(num){ 
    //move cursor up and to first column
    num =getNumberValue(num, 1);
    this.x=0;
    this._cursor_up(num);
}
Terminal.prototype._code_CR=function(){
    //carriage return
    this.x=0;
}
Terminal.prototype._code_CSI=function(){
    //ESC [
    this._code_default("CSI");
}

Terminal.prototype._code_CUB=function(lnum){
    var pnum =getNumberValue(lnum, 1);
    //move cursor left
    if(this.x>=pnum){
        this.x-=pnum;
    }else{
        this.x=0;
    }
}

Terminal.prototype._code_CUD=function(num){
    var pnum =getNumberValue(num, 1);
    //move cursor down
    this._cursor_down(pnum);
}
    
Terminal.prototype._code_CUF=function(rnum){
    //move cursor right
    var num =getNumberValue(rnum, 1);
    if(this.x+num>=this.cols-1){
        this.x=this.cols-1;
    }
    else{
        this.x+=num;
    }
}

Terminal.prototype._code_CUP=function(crow,ccol){
    //move cursor to row, column    
    var row=getNumberValue(crow, 1);
    var col=getNumberValue(ccol, 1);
    var vy=row<0?0:(row>=this.rows?this.rows-1:row-1);
    var vx=col<0?0:(col>=this.cols?this.cols-1:col-1);
    this.x=vx;
    this.y=vy;
}

Terminal.prototype._code_RI=function(){
    //reverse line feed
    this._move_up(1);
}

Terminal.prototype._code_CUU=function(parnum){
    var num=getNumberValue(parnum, 1);
    //move cursor up
    var n=(num>this.rows?this.rows:num);
    this._cursor_up(n);
}
Terminal.prototype._code_DA=function(){
    this.call_output("\x1b[?6c");
}

Terminal.prototype._code_DCH=function(num){
    //delete characters on current line
    /*Deletes Pn characters, starting with the character at cursor position. 
    When a character is deleted, all characters to the right of cursor move left. 
    This creates a space character at right margin. This character has same character attribute as the last character moved left.
    */
    var length=getNumberValue(num,1);
    //move text left
    var idx=this.y*this.cols+this.x;
    var end=(this.y+1)*this.cols;
    for(var i=idx;i<end;i++){
         var srcidx=i+length;
         if(srcidx<end){
            this.scrt[i]=this.scrt[srcidx];
         }else{
            this.scrt[i]=NULL_CHAR_CODE;
            this.scra[i]=DEFAULT_ATTR;
         }
    }
}

Terminal.prototype._code_DCS=function(){
    //device control string (ignored)
    this._escbuf="";
    this._inesc="DCS_ST";
}
Terminal.prototype._code_DECSTBM=function(top,bottom){
    //set scrolling region, paramete index is start from 1 not zero
    //e.g. ESC [1;24r
    top=getNumberValue(top,1);
    bottom=getNumberValue(bottom,this.rows);
    var vtop=top<0?0:(top>=this.rows? this.rows-1:top-1);
    var vbott=bottom<0?0:(bottom>=this.rows?this.rows-1:bottom-1);
    if(vbott<vtop){
        this._scrolltop=vbott;
        this._scrollbottom=vtop;
    }else{
        this._scrolltop=vtop;
        this._scrollbottom=vbott;
    }
}

Terminal.prototype._code_DECAWM=function(num){
//line auto wrap
this.opts["LINEWRAP"]=num;
}

Terminal.prototype._code_DECCOLM=function(num){
    if(num==1){
    //mode  ESC [?3h
        this.cols=132;
    }else{
    //rest mode ESC[?3l
        this.cols=80;
    }
    this.reset();
}

Terminal.prototype._code_DECTCEM=function(num){
    this.cursor=num;
}


Terminal.prototype._code_DL=function(num){
    /*
    DL causes the contents of the active line (the line that contains the active presentation position) and, depending on the setting of the LINE EDITING MODE (VEM), the contents of the n-1 preceding or following lines to be removed from the presentation component, where n equals the value of Pn.
    */
    var line=getNumberValue(num,1);
    this._scroll_content_up(this.y,this._scrollbottom,line);
}

Terminal.prototype._code_DSR=function(num){
    //device status report
    if(num==6){
        this.call_output("\0x1b["+this.y+";"+this.x+"R");
    }
    else if(num==5){
        this.call_output("\0x1b[0n");
    }
    
}

Terminal.prototype._code_ECH=function(num){
    //erase characters on current line
    var length=getNumberValue(num,1);
    if(length+this.x>this.cols){
        length=this.cols-this.x;
    }
    this.scrt.batchUpdate(this.y*this.cols+this.x, length,NULL_CHAR_CODE);
    this.scra.batchUpdate(this.y*this.cols+this.x, length,DEFAULT_ATTR);   
}

Terminal.prototype._code_ED=function(type){
    //erase display
    //0 the active presentation position and the character positions up to the end of the page are put into the erased state
    //1 the character positions from the beginning of the page up to and including the active presentation position are put into the erased state
    //2 all character positions of the page are put into the erased state
    var num = getNumberValue(type,0);
    //Wipe-cursor-to-end is the same as clear-whole-screen if cursor at top left
    if(this.x==0 && this.y==0 && num==0){
        //user run clear will tigger ESC[H ESC[J (set cursor to zero and erase display)
        num=2;
    }
    if(num==0){//0 from cursor to end of screen, including cursor position.
        var v_pos=this.y*this.cols+this.x;
        var length=this.cols*this.rows-v_pos;
        this.scrt.batchUpdate(v_pos, length,NULL_CHAR_CODE);
        this.scra.batchUpdate(0, length,DEFAULT_ATTR);     
    }else if(num==1){//1 from beginning of screen to cursor
        var length=this.y*this.cols+this.x+1;
        this.scrt.batchUpdate(0, length,NULL_CHAR_CODE);
        this.scra.batchUpdate(0, length,DEFAULT_ATTR); 
    }else{
        //clear all, set default screen
        this.scrt.batchUpdate(0, this.rows*this.cols,NULL_CHAR_CODE);
        this.scra.batchUpdate(0, this.rows*this.cols,DEFAULT_ATTR); 
    }
}

Terminal.prototype._code_EL=function(num){
    //erase line
    //0 the active presentation position and the character positions up to the end of the line are put into the erased state
    //1 the character positions from the beginning of the line up to and including the active presentation position are put into the erased state
    //2 all character positions of the line are put into the erased state
    var lineBegin=this.y*this.cols;
    var pnum=getNumberValue(num,0);    
    if(pnum==0){
        //0 = cursor to end
        var length=this.cols-this.x;//including current position
        this.scrt.batchUpdate(lineBegin+this.x,length,NULL_CHAR_CODE);
        this.scra.batchUpdate(lineBegin+this.x,length,DEFAULT_ATTR);
    }else if(pnum==1){//clear begin to cursor(including)
        this.scrt.batchUpdate(lineBegin,this.x+1,NULL_CHAR_CODE);
        this.scra.batchUpdate(lineBegin,this.x+1,DEFAULT_ATTR);
    }else{
        //clear all, set default screen,2 = whole line
        this.scrt.batchUpdate(lineBegin,this.cols,NULL_CHAR_CODE);
        this.scra.batchUpdate(lineBegin,this.cols,DEFAULT_ATTR);
    }
}
Terminal.prototype._code_ESC=function(){//start escape sequence
    if(this._escbuf!=null && this._inesc.match(/OSC|_ST/)){
        this.escbuf+="\x1B";
        this._process_escseq();
        return;
    }
    this._code_default("ESC");
}
Terminal.prototype._code_LF=function(){
    if(this.opts['LFTOCRLF']==1){
        this._code_CR();
    }
    this._move_down(1);
}

Terminal.prototype._code_NEL=function(){ //NEW LINE
    this._code_CR();
    this._code_LF();
}

Terminal.prototype._code_HT=function(){ //horizontal tab to next tab stop
    //find next tab stop
    var i=this.x;
    for(;i<this.cols;i++){
        if(typeof this._tabstops[i]=="undefined" ||this._tabstops[i]!=1 ){
            this.x=i;
            break;
        }
    }
    if(i==this.cols){
        this.x=this.cols-1;
    }
}
Terminal.prototype._code_HTS=function(){ //set tab stop at current column
    this._tabstops[this.x]=1;    
}

Terminal.prototype._code_ICH=function(num){
    //prepare the insertion of n characters
    for(var i=0;i+num<this.cols && i<num;i++){
        var idx=this.y*this.cols+i;
        this.scra[idx]=DEFAULT_ATTR;
        this.scrt[idx]=NULL_CHAR_CODE;
    }    
}

Terminal.prototype._code_IL=function(num){
    //insert blank lines
    //The previous contents of the active line and of adjacent lines are shifted away from the active line. 
    //The contents of n lines at the other end of the shifted part are removed.
    this._scroll_content_down(this.y,this.scrollbottom,num);
}

Terminal.prototype._code_default=function(msg){
    //privacy message (ignored)
    this._escbuf="";
    this._inesc=msg;    
}
Terminal.prototype._code_PM=function(){
    this._code_default("PM_ST");    
}

Terminal.prototype._code_APC=function(){
    this._code_default("APC_ST");     
}

Terminal.prototype._code_OSC=function(){
    this._code_default("OSC");     
}

Terminal.prototype._code_RIS=function(){
    this.reset();
}

Terminal.prototype._toggle_mode=function(){
    //set/reset modes
    var flag=arguments[0];
    var modeArray=arguments[1];
    for(var i=0;i<modeArray.length;i++){       
        var name=this._modeseq[modeArray[i]] || "";
        var func=this._funcs[name];
        this._code_default("");
        if(typeof func !="undefined"){
            this[func].call(this,flag);
        }
    }
}
Terminal.prototype._code_RM=function(){
    this._toggle_mode(0,arguments);    
}

Terminal.prototype._code_SM=function(){
    this._toggle_mode(1,arguments);    
}

Terminal.prototype._code_SGR=function(){
    var sgrArray=arguments;
    for(var i=0;i<sgrArray.length;i++){
        var n=Number(sgrArray[i]);
        //sameness is determined by the === operator
        switch(n){
            case 0: //default rendition cancels the effect of any preceding 
                //occurrence of SGR in the data stream regardless of the setting
                if(this.attr !=DEFAULT_ATTR) {
                    this.attr =DEFAULT_ATTR;
                    this.attrObj= new TermAttribute(DEFAULT_ATTR);
                }
                break;
            case 1: //bold
                this.attrObj.bold=1;
                this.attrObj.faint=0;
                break;
            case 2: //faint
                this.attrObj.bold=0;
                this.attrObj.faint=1;
                break;                
            case 4: //singly underlined
                this.attrObj.underline=1;
                break;
            case 5: //blink ON
                this.attrObj.blink=1;
                break;                
            case 7: //negative image
                this.attrObj.reverse=1;
                break;
            case 21:
            case 22: //negative image
                this.attrObj.bold=0;
                this.attrObj.faint=0;  
                break;
            case 24: //not underlined (neither singly nor doubly)
                this.attrObj.underline=0;
                break;
            case 25: //blink off
                this.attrObj.blink=0;
                break;
            case 27: //positive image disable reverse video
                this.attrObj.reverse=0;
                break;
            case 30:
            case 31:
            case 32:
            case 33:
            case 34:
            case 35:
            case 36:
            case 37:
                /* foreground 30->black 31->red 32-green 
                 * 33->yellow 34->blue 35->magenta 36->cyan 37->white */
                this.attrObj.fg=n-30;
                break;
            case 38: //underline on, default fg
                this.attrObj.underline=1;
                this.attrObj.fg=7;
                break;
            case 39://underline off, default fg
                this.attrObj.underline=0;
                this.attrObj.fg=7;
                break;
            case 40:
            case 41:
            case 42:
            case 43:
            case 44:
            case 45:
            case 46:
            case 47:
                /* background 40->black 41->red 42->green 
                 * 43->yellow 44->blue 45->magenta 46->cyan 47->white */
                this.attrObj.bg= n-40;
                break;
            case 49: //default background
                this.attrObj.bg=0;
                break;                    
        }
         //console.log(sgrArray[i] +" par n "+n+" fg is"+this.attrObj.fg +" ATT"+this.attrObj.packAttr());
    } 
    //update attribute
    this.attr=this.attrObj.packAttr();   
}

Terminal.prototype._code_VPA=function(num){
    num=getNumberValue(num,1);
    //move to row (current column)
    var n=num>=this.rows?this.rows-1:(num<0?0:num-1);
    this.y=n;
}

Terminal.prototype._code_DECALN=function(num,attr){
    //fill screen with E
    for(var i=0; i<this.scra.length;i++){
        this.scra[i]=DEFAULT_ATTR;
        this.scrt[i]=69; //E ascii is 69
    }
    this.x=0;
    this.y=0;
}
Terminal.prototype._code_DECSC=function(){
    //save state
    this.vt_saved = {};
    this.vt_saved.x=this.x;
    this.vt_saved.y=this.y;
    this.vt_saved.attr=this.attr;
    this.vt_saved.cursor=this.cursor;
}
Terminal.prototype._code_DECRC=function(){
    if(typeof this["vt100_saved"] !="Object"){
        return;
    }
    //restore
    this.x=this.vt_saved.x;
    this.y=this.vt_saved.y;
    this.attr=this.vt_saved.attr;
    this.cursor=this.vt_saved.cursor;
}

Terminal.prototype._code_CUPSV=function(){
    this.point={};
    this.point.x=this.x;
    this.point.y=this.y;
}
Terminal.prototype._code_CUPRS=function(){
    if(typeof this["point"] !="Object"){
        return;
    }
    this.x=this.point.x;
    this.y=this.point.y;
}
Terminal.prototype._code_XON=function(){
    this._xon=1;
}
Terminal.prototype._code_XOFF=function(){
    if(!this.opts["IGNOREXOFF"]){
        return;
    }
    this._xon=0;
}
Terminal.prototype._code_IGN=function(){
    //no action
    }
    
Terminal.prototype.dumpText=function(){
 var txt="";
   for (var i=0;i<this.rows;i++){
        for(var j=0;j<this.cols;j++){
            var idx=i*this.cols+j;
            var ch=this.scrt[idx];
            if(ch==0){
                txt+=" ";
            }
            else {
                txt+=String.fromCharCode(this.scrt[idx]);
            }
        }
        txt+="\n";
   }
    return txt;
}   

Terminal.prototype.dumpHTML=function(){
    //move cursor to next if reach line end, cursor will not show if out of screen
    var cx=this.x;    
    var cy=this.y;
    var previous_attr=-1;
    var dhtml="";
    for (var i=0;i<this.rows;i++){
        for(var j=0;j<this.cols;j++){
            var idx=i*this.cols+j;
            var ch=this.scrt[idx];
            var c_attr=this.scra[idx];
            if(i==cy && j==cx && this.cursor==1){
                    //reverse to high light
                    c_attr ^=1<<12;
            }
            if(previous_attr!=c_attr){
                var curr_attr=new TermAttribute(c_attr);
                //attribute changed
                if(previous_attr!=-1){
                    //new attribute start
                    dhtml+='</span>';                    
                }
                var fg =curr_attr.fg+8*curr_attr.bold;
                var bg =curr_attr.bg+8*curr_attr.blink;
                //Inverse
                if(curr_attr.reverse){
                    var tmp=fg;
                    fg=bg;
                    bg=tmp;
                }
                //# Underline
                var ul="";
                if(curr_attr.underline){
                    ul = ' ul';
                }else{
                    ul = '';
                }             
                dhtml=dhtml+"<span class='f"+fg+" b"+bg+ul+"'>";
                previous_attr=c_attr;
            }
            if(ch==38){
                dhtml+="&amp;";
            }else if(ch==60){
                dhtml+='&lt;';
            }else if(ch==62){
                dhtml+='&gt;';
            }
            else if(ch==0){
                dhtml+="\u0020";
            }else {
            //TODO fix for UTF8
            dhtml+= String.fromCharCode(ch);
               // dhtml+=String.fromCharCode(ch);
            }            
        }
        //add new line
        dhtml+="\n";
    }
    dhtml += "</span>\n";
    return '<div y="'+cy+'" x="'+cx+'" ></div>'+dhtml;
}

function getNumberValue(par,defaultValue){
    var result=par;
    if(typeof par =="undefined"){
        return defaultValue;
    }else if((par instanceof Array || typeof par == "array") && par.length==1){
        //check if only have empty string which is returned by String.split
        result=par[0];        
   }
   if(typeof result=="string" && result.length==0){
            return defaultValue;
   }
   var pnum=Number(result);
   if(pnum<defaultValue){
        return defaultValue;
   }else {
        return Number(result);
   }
}