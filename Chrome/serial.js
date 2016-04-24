var connectionId = -1;
var readBuffer = "";
var port = 9999;
var connectedSockets = [];
var isServer = false;
var connection;
var arduinoCMD = "";
var server;
var isVerchecked = false;
var newVersion,arduinVersion;
var gpio = {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0,13:0,14:0,15:0,16:0,17:0,18:0,19:0,20:0,21:0};
var distance=0;
var WFduinoType = 1; //0: scratch 1:scratchx
var timeManager = { lastTime: 0, startTime: 0, millis: 0, lastTimeSend:0 };
var restfullGet="";
var lassData = { C: 0, H: 0, PM25: 0 };
var page={url:"",count:0};

function $(id) {
  return document.getElementById(id);
}

function getNewVersion() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "http://wf8266.com/wf8266r/api/ota/wfduino", true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      // JSON.parse does not evaluate the attacker's scripts.
      var resp = JSON.parse(xhr.responseText);
      $('version').innerText = resp.Version;
      newVersion = resp.Version.replace('.','');
    }
  }
  xhr.send();
}
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}
function httpRequest(_type,uri) {

  uri = replaceAll(uri,"%3A",":")
  uri = replaceAll(uri, "%2F","/");
  uri = replaceAll(uri, "%3F","?");
  uri = replaceAll(uri, "%3D","=");
  uri = replaceAll(uri, "%26","&");
  
  var xhr = new XMLHttpRequest();
  xhr.open(_type, uri, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      // JSON.parse does not evaluate the attacker's scripts.
      restfullGet =  xhr.responseText;
    }
  }
  xhr.send();
}
function lass(device) {

  var xhr = new XMLHttpRequest();
  xhr.open("GET", 'http://nrl.iis.sinica.edu.tw/LASS/last.php?device_id=' + device, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      // JSON.parse does not evaluate the attacker's scripts.
      var jsonObj = JSON.parse(xhr.responseText);
                //console.log(jsonObj);
                lassData.C = jsonObj.s_t0;
                lassData.H = jsonObj.s_h0;
                lassData.PM25 = jsonObj.s_d0;
    }
  }
  xhr.send();
}

onload = function () {
  getNewVersion();
  showMessage('Init...')
  var deviceList = document.getElementById('deviceList');
  var btnClose = $('btnClose');
  var btnScratchX = $('btnScratchX');
  var btnFirmware = $('btnFirmware');
  var onGetPorts = function (ports) {
    var eligiblePorts = ports.filter(function (port) {
      return (!port.path.match(/[Bb]luetooth/) && port.path.match(/\/dev\/tty/)) || port.path.match(/COM/);
    });

    for (var i = 0; i < eligiblePorts.length; i++) {
      var device = document.createElement('option');
      device.value = device.innerText = eligiblePorts[i].path;
      if (i == 0)
        deviceList.appendChild(document.createElement('option'));
      deviceList.appendChild(device);
    }

    setStatus("Ready");
  }

  btnClose.onclick = function () {
    for (var i = 0; i < connectedSockets.length; i++) {
      connectedSockets[i].close();
    }
    if (connectionId != -1)
      chrome.serial.disconnect(connectionId, function () {
        showMessage(connectionId + ' closed.');
      });
    server.close();
    setTimeout(function () {
      window.open('', '_self', '');
      window.close();
    }, 0);
  }
  
  btnScratchX.onclick = function () {
    window.open('http://goo.gl/fnON4H','scratchX','');
  }
  
  btnFirmware.onclick = function () {
    window.open('https://goo.gl/3Lbm0Q','scratchX','');
  }

  deviceList.onchange = function () {
    if (connectionId != -1) {
      chrome.serial.disconnect(connectionId, openSelectedPort);
      return;
    }
    openSelectedPort();
  }
  chrome.serial.getDevices(onGetPorts);
  socketServer();
};

function socketServer() {
  if (http.Server && http.WebSocketServer) {
    // Listen for HTTP connections.
    server = new http.Server();
    var wsServer = new http.WebSocketServer(server);

    serverId = server.listen(port);
    isServer = true;

    server.addEventListener('request', function (req) {
      var url = req.headers.url;
      if(url == "/crossdomain.xml")
        req.serveUrl(url);
      else
      {
          req.write(doRESTful(url));
          req.edn();
      }
      return true;
    });

    wsServer.addEventListener('request', function (req) {
      showMessage('ScratchX connected');
      var socket = req.accept();
      connectedSockets.push(socket);

      // When a message is received on one socket, rebroadcast it on all
      // connected sockets.
      socket.addEventListener('message', function (e) {
        for (var i = 0; i < connectedSockets.length; i++)
          connectedSockets[i].send(e.data);
      });

      // When a socket is closed, remove it from the list of connected sockets.
      socket.addEventListener('close', function () {
        showMessage('ScratchX disconnected');
        for (var i = 0; i < connectedSockets.length; i++) {
          if (connectedSockets[i] == socket) {
            connectedSockets.splice(i, 1);
            break;
          }
        }
      });
      return true;
    });
  }
}

function doRESTful(url){
  url = url.substring(1,url.length)+"/";

  var message = "";
  var index=0;
  var cmd = "",p1="",p2="",p3="",temp="";
  for(var i=0;i<url.length;i++)
  {
    if(url[i]=='/')
    {
      switch(index)
      {
        case 0 : cmd = temp; index++; break;
        case 1 : p1 = temp; index++; break;
        case 2 : p2 = temp; index++; break;
        case 3 : p3 = temp; index++; break;
      }
      temp = "";

    }
    else
      temp+=url[i];
  }
  
  if(cmd == "")
    cmd = url;
    
  if(cmd != "poll")  
    console.log(cmd + " " + p1 + " " + p2 + " " + p3);
    
  switch(cmd)
  {
    case "poll" : showMessage('Scratch2 connected'); 
      WFduinoType = 0; 
      timeManager.millis = (new Date).getTime();
      if( (new Date).getTime() - timeManager.lastTime > 1000)
      {
        timeManager.lastTime = (new Date).getTime();
        send("readGPIO\r\n");
      }
      message = "digitalRead/0 "+gpio[0]
      +"\ndigitalRead/1 "+gpio[1]
      +"\ndigitalRead/2 "+gpio[2]
      +"\ndigitalRead/3 "+gpio[3]
      +"\ndigitalRead/4 "+gpio[4]
      +"\ndigitalRead/5 "+gpio[5]
      +"\ndigitalRead/6 "+gpio[6]
      +"\ndigitalRead/7 "+gpio[7]
      +"\ndigitalRead/8 "+gpio[8]
      +"\ndigitalRead/9 "+gpio[9]
      +"\ndigitalRead/10 "+gpio[10]
      +"\ndigitalRead/11 "+gpio[11]
      +"\ndigitalRead/12 "+gpio[12]
      +"\ndigitalRead/13 "+gpio[13]
      +"\nanalogRead/0 "+gpio[14]
      +"\nanalogRead/1 "+gpio[15]
      +"\nanalogRead/2 "+gpio[16]
      +"\nanalogRead/3 "+gpio[17]
      +"\nanalogRead/4 "+gpio[18]
      +"\nanalogRead/5 "+gpio[19]
      +"\nanalogRead/6 "+gpio[20]
      +"\nanalogRead/7 "+gpio[21]
      +"\nreadDistance "+distance
      +"\nreadSensor/RESTfulGET/Value "+restfullGet
      +"\nreadSensor/LASS/Value "+lassData.PM25
      +"\nreadSensor/LASS/C "+lassData.C
      +"\nreadSensor/LASS/H "+lassData.H
      +"\nreadSensor/LASS/PM25 "+lassData.PM25
      ; 
      break;
    case "pinMode" :
        if (p2 == "INPUT")
            p2 = 0;
        else
            p2 = 1;
        send(cmd+"," + p1 + "=" + p2+"\r\n");break;
    case "digitalWrite" : send(cmd+"," + p1 + "=" + p2+"\r\n");break;
    case "analogWrite" : send(cmd+"," + p1 + "=" + p2+"\r\n");break;
    case "distance" : send(cmd+",echo=" + p1 + "&trig=" + p2+"\r\n");break;
    case "servo" : send(cmd+",pin=" + p1 + "&degree=" + p2+"\r\n");break;
    case "tone" : 
        p2 = p2.replace("%2C",",");
        var fre;
        if(p2.indexOf(",")>0)
            fre = p2.split(',')[1];
        else
            fre = p2;
        send(cmd+",pin=" + p1 + "&" + parseInt(fre) + "=" + p3+"\r\n");break;
    case "noTone" : send(cmd+",pin=" + p1+"\r\n");break;   
    case "http" : httpRequest(p2,p3); break; 
    case "lass" : lass(p1); break;
    default : break;
  }
  
  return message;
}

function setStatus(status) {
  document.getElementById('status').innerText = status;
}

function showMessage(msg) {
  document.getElementById('message').innerText = msg;
}

function openSelectedPort() {
  var deviceList = document.getElementById('deviceList');
  var selectedPort = deviceList.options[deviceList.selectedIndex].value;
  if(selectedPort != '')
    chrome.serial.connect(selectedPort, { bitrate: 115200 }, onOpen);
}

function onOpen(openInfo) {
  connectionId = openInfo.connectionId;
  console.log("connectionId: " + connectionId);
  if (connectionId == -1) {
    setStatus('Could not open');
    return;
  }
  setStatus(connectionId + ' Connected');
  chrome.serial.onReceive.addListener(onRead);
};

function send(cmd) {
  if(connectionId == -1)
    return;
  var buffer = new ArrayBuffer(cmd.length);
  var uint8View = new Uint8Array(buffer);
  for (var i = 0; i < cmd.length; i++)
    uint8View[i] = cmd.charCodeAt(i);
    
    chrome.serial.send(connectionId, buffer, function () { });
};

function getCMD(cmd) {
  var uint8View = new Uint8Array(cmd);
  var str = "";
  var isFinish = false;
  
  for (var i = 0; i < uint8View.length; i++) {
      str += String.fromCharCode(uint8View[i]);
  }
  if (uint8View[uint8View.length - 1] == 10 && uint8View[uint8View.length - 2] == 13) {
    str = arduinoCMD + str;
    arduinoCMD = "";
    return str;
  }
  else {
    arduinoCMD += str;
    return "";
  }
}

function onRead(readInfo) {
  var backCMD = getCMD(readInfo.data);
console.log("UART Rx : " + backCMD);
  if (!isVerchecked) //version check
  {
    var index = backCMD.indexOf(".WFduino.Ready");
    if (index > 0) {
      backCMD = backCMD.replace(".WFduino.Ready", "");
      $('aversion').innerText = backCMD;
      arduinVersion = backCMD.replace('.','');
      backCMD = "";
      isVerchecked = true;
      if(newVersion > arduinVersion)
      {
        setStatus('Older firmware');
        window.open('https://goo.gl/3Lbm0Q','scratchX','');
      }
    }
  }
  
  if (backCMD != "") {
    if(WFduinoType == 0) //Scratch2 HTTP
    {
      if(backCMD[0] != '{')
        return;
      var json = JSON.parse(backCMD);
      switch(json.Action){
        case "readGPIO" : var gpios = json.Value.split(','); 
          for(var i=0;i<Object.keys(gpio).length;i++)
              gpio[i] = gpios[i];
          break;
        case "distance" : distance = json.distance; break;
        default : break;
      }
    }
    else //ScratchX WebSocket
    {
      for (var i = 0; i < connectedSockets.length; i++)
        connectedSockets[i].send(backCMD);
    }
  }

};

//---------------------- Socket Server
document.addEventListener('DOMContentLoaded', function () {

  // FIXME: Wait for 1s so that HTTP Server socket is listening...
  setTimeout(function () {
    var address = isServer ? 'ws://localhost:' + port + '/' :
      window.location.href.replace('http', 'ws');
    connection = new WebSocket(address);
    connection.addEventListener('open', function () {
      showMessage('WFduino Agent connected');
    });
    connection.addEventListener('close', function () {
      showMessage('WFduino Agent closed');
    });
    connection.addEventListener('message', function (e) {
      console.log(e.data);
      send(e.data);
    });

  }, 1e3);
});