var fs = require('fs');
var w=require("../vt102.js");
for(var i=2;i<process.argv.length;i++){
      var term=new w.Terminal(80,25);
      fs.readFile(process.argv[i], function (err, data) {
          if (err) throw err;
          term.process(data); 
          var s=term.dumpHTML();
          console.log(s)
    });
};

