var fs = require('fs');
var Logger=exports.Logger=function(enabled,file){
   this.enabled=enabled;
   this.logfile=-1;
   var self=this;
   if(enabled){
        this.logfile=fs.createWriteStream(file);
   }
}

Logger.prototype.log=function(msg){
   process.stdout.write(msg+"\n");
   if(this.enabled== 1 && this.logfile !=-1){       
        this.logfile.write(msg+"\n");
   }
}

Logger.prototype.close=function(){
    if(this.enabled==1 && this.logfile !=-1){
        this.logfile.end();
    }
}

Logger.prototype.hook=function(){
    var self=this;
    if(this.enabled==1 && this.logfile !=-1){
        console.log=function(msg){
            self.log(msg);
            //process.stdout.write(msg+"\n");
        }
    }
}