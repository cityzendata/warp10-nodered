module.exports = function(RED) {


    function WarpscriptNode(config) {

        RED.nodes.createNode(this,config);
        var node = this;
        this.warpUrl = config.warpurl;
        this.warp = config.warp;  

        var urllib = require("url");

        var https = require('https');
        var http = require('http');

        var isTemplatedUrl = (this.url ||"").indexOf("{{") != -1;

        this.on('input', function(msg) {
          //msg.payload = msg.payload + ' ' + this.url + ', warp= ' + this.warp;
          //node.send(msg);
          var method = "POST";
          var postData = "{ ";
          for(var key in msg){
            currentData = msg[key];
            var parsed = parse(currentData) ;
            if (undefined != parsed) {
              postData += " '" +  key.toString() + "' " + parsed;
            }
          }
          postData += "} " + this.warp;
          var async = true;


          var opts = urllib.parse(this.warpUrl);
          var post_options = {
              host: opts.hostname,
              port: opts.port,
              path: opts.path,
              method: 'POST',
              headers: {
                  'Content-Type': 'test/plain',
                  'Content-Length': Buffer.byteLength(postData)
              }
          };

          // Set up the request

          var post_req = ((/^https/.test(this.warpUrl))?https:http).request(post_options, function(res) {
              res.setEncoding('utf8');
              res.on('data', function (chunk) {
                  //console.log('Response: ' + chunk);
                  messages = JSON.parse(chunk);
                  var mapMessage = messages[0];
                  var returnTab = [];
                  for (var input in mapMessage ) {
                    returnTab.push(parseInt(input, 0));
                  }
                  var max = 0; 
                  returnTab.forEach(function (item, index, array) {
                    if (item > max) {
                      max = item;
                    }
                  }); 

                  var tabFilled = [];
                  for(index = 0; index <= max; ++index) { 
                    if (index.toString() in mapMessage) {
                      tabFilled.push(mapMessage[index.toString()]);
                    } else {
                      tabFilled.push(null);                     
                    }
                  }
                  node.send(tabFilled);
              });
          });

          post_req.on('error',function(err) {
                node.error(err,msg);
                msg.payload = err.toString() + " : " + this.warpUrl;
                msg.statusCode = err.code;
                node.send(msg);
                node.status({fill:"red",shape:"ring",text:err.code});
          });
        
          // post the data
          post_req.write(postData);
          post_req.end();
        });
    }

    function parse(currentData) {
      if (typeof currentData === 'string') {  
        return " '" + currentData.toString() + "' ";
      }
      if (typeof currentData === 'number' || typeof currentData === 'boolean') {  
        return currentData.toString() + " ";
      }
      if (typeof currentData === 'Buffer') {
        return currentData.toString('utf-8') + "' ";
      }
      if (Array.isArray(currentData)) {
        var array= " [ ";
        for (index = 0; index < currentData.length; ++index) {  
          array += parse(currentData[index]);
        }
        array += " ] ";
        return array;
      }
      if (typeof currentData === 'object') {
        if (null === currentData) {
          return "NULL";
        }
        var obj= " { ";
        for(var keyItem in currentData){
          subItem = currentData[keyItem];
          obj += " '" +  keyItem.toString() + "' " + parse(subItem);
        } 
        obj += " } ";
        return obj;
      }
      return undefined;
    }

    RED.nodes.registerType("warpscript",WarpscriptNode);
}