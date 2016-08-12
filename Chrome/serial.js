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
var timeManager = { lastTime: 0, startTime: 0, millis: 0, lastTimeSend:0, cmdTime:1000, lastCMD:"", lastResponse: 0,
  startTimeWF8266R:0, lastTimeWF8266R:0, millisWF8266R:0 };
var restfullGet="";
var lassData = { C: 0, H: 0, PM25: 0 };
var page={url:"",count:0};
var speakText = "";
var rec;
var isConnectedWFduino = false;
var isCloud = false;
var isFirst = true;
var voiceData = { Text: '' };
var jsonData = { data : "", obj : "", count:0, isRequest:false};
var irCode = "";
var isIRControl = false;
var isBluetooth = false;

   //WF8266R
    var package = { send: 0, recv: 0, millis: 0 };
    var isConnectedWF8266R = false;
    var connectionWF8266R;
    var socketCounter = 0;
    var ip="";
    var socketBuffer="";
    
//WF8266R 
    function set_ip(_ip) {
        if (isConnectedWF8266R)
            return;
            
        if(ip == _ip)
          return;
          
        ip = _ip;
        socketConnectionWF8266R(_ip);
    };
    
    function stopWF8266R(){
        if(connectionWF8266R != null)
            connectionWF8266R.close();
    }    
    
    function sendWF8266R(cmd) {
        timeManager.millisWF8266R = (new Date).getTime();

        //console.log(cmd + " " + socketCounter);
        package.send++;
        if (isConnectedWF8266R && socketCounter == 0) {
            if ((timeManager.millisWF8266R - timeManager.lastTimeWF8266R) > 100) {
                timeManager.lastTimeWF8266R = (new Date).getTime();
                socketCounter++;
                //console.log(cmd);
                connectionWF8266R.send(cmd);
            }
        }

    }
    
    function socketConnectionWF8266R(ip) {
        timeManager.startTimeWF8266R = (new Date).getTime();
        connectionWF8266R = new WebSocket('ws://' + ip + ':81/api', ['wf8266r']);
        connectionWF8266R.onopen = function (e) {
            isConnectedWF8266R = true;
            speak('WF8266R connected');
            showMessage('WF8266R 已連接');
        };
        connectionWF8266R.onclose = function (e) {
            isConnectedWF8266R = false;
            speak('WF8266R disconnect');
            showMessage('WF8266R 已斷線');
        };
        connectionWF8266R.onmessage = function (e) {
            var jsonObj;
            if(e.data.length == 1)
            {
                socketBuffer+= e.data;
                if(e.data=='}')
                {
                    jsonObj = JSON.parse(socketBuffer);
                   
                    socketBuffer = "";
                }
                else
                    return;
                    
            }
            else
            {
                socketCounter--;
                package.recv++;
                isConnectedWF8266R = true;
                jsonObj = JSON.parse(e.data.substring(0, e.data.length - 1).replace("\r\n",""));
            }

            console.log(jsonObj);
            switch (jsonObj.Action) {
                case "digitalRead": eval('gpio.D' + jsonObj.Pin + '=' + jsonObj.Value); break;
                case "analogRead": eval('gpio.A' + jsonObj.Pin + '=' + jsonObj.Value); break;
                case "readGPIO" : var gpios = jsonObj.Value.split(','); 
                        for(var i=0;i<Object.keys(gpio).length;i++)
                            gpio[i] = gpios[i];
                        break;
                default: break;
            }

        };
        connectionWF8266R.onerror = function (e) {
            isConnectedWF8266R = false;
        };
    }
//WF8266R Function end    

function ELE(id) {
  return document.getElementById(id);
}

function speak(text){
if(speakText == text )
  return;
  
  speakText = text;
  var u = new SpeechSynthesisUtterance(text.toString());
        u.onend = function (event) {
            speakText = "";
        };
        
        speechSynthesis.speak(u);

}

function speech_text() {       

        if (rec == null)
            rec = new webkitSpeechRecognition();
        else
            rec.stop();

        rec.lang = "zh-TW";
        rec.continuous = false;
        rec.interimResults = true;
        rec.start();
        var result = "";

        rec.onend = function () {
            console.log("end");
            rec.start();
        }

        rec.onstart = function () {
            //console.log("start");
        }

        rec.onerror = function (event) {
            //console.log(event);
        }

        rec.onresult = function (event) {
            console.log(event.results);
            if (typeof (event.results) == 'undefined') {
                rec.onend = null;
                rec.stop();
            }

            if (event.results.length > 0) {
                if (event.results[event.results.length - 1].isFinal)
                {
                    voiceData.Text = event.results[event.results.length - 1][0].transcript;
                    voiceData.Text = replaceAll(voiceData.Text," ","");
                    console.log(voiceData.Text);
                    
                    for (var i = 0; i < connectedSockets.length; i++)
                      connectedSockets[i].send("{\"Action\":\"voiceText\",\"Text\":\""+voiceData.Text+"\"} ");
                }
            }
        }
}

function parseURI(uri)
{
  uri = replaceAll(uri,"%3A",":")
  uri = replaceAll(uri, "%2F","/");
  uri = replaceAll(uri, "%3F","?");
  uri = replaceAll(uri, "%3D","=");
  uri = replaceAll(uri, "%24","$");
  uri = replaceAll(uri, "%26","&");
  return uri;
}

function getJSON(uri, index) {
  if(jsonData.isRequest)
    return;
  jsonData.isRequest = true;  
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "http://wf8266.com/wf8266r/data/getJSON.aspx", true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      parseJSON(xhr.responseText);  
      jsonData.isRequest = false;
    }
  }
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.send("url="+uri);
}

function parseJSON(responseText)
{
  var resp = JSON.parse(responseText);
      if(resp.feed!=null)
      {
        console.log(resp.feed.entry);
        jsonData.obj=resp.feed.entry;
        jsonData.count = resp.feed.entry.length;
      }
      else if(resp.feeds != null)
      {
        console.log(resp.feeds);
        jsonData.obj = resp.feeds;
        jsonData.count = resp.feeds.length;
      }
      else if(resp.result != null)
      {
        console.log(resp.result.records);
        jsonData.obj = resp.result.records;
        jsonData.count = resp.result.records.length;
      }
      else if(resp.observations != null)
      {
        console.log(resp.observations.data);
        jsonData.obj = resp.observations.data;
        jsonData.count = resp.observations.data.length;
      }
      else
      {
        jsonData.obj = resp;
        jsonData.count = resp.length;
        if(jsonData.count == undefined)
          jsonData.count = 0;
      }
}

function getJSONRead(index, name)
{  
  name = parseURI(name);
  name = decodeURI(name);
  console.log(name);
  switch(name)
  {
    case "title" : 
      if(jsonData.count > 0)
        jsonData.data = jsonData.obj[index-1].title.$t; 
      else
        jsonData.data = jsonData.obj.title;
    break;
    case "content" : 
      if(jsonData.count>0)
        jsonData.data = jsonData.obj[index-1].content.$t; 
      else
        jsonData.data = jsonData.obj.content;
    break;
    default :
    var data; 
    if(jsonData.count > 0)
      data = jsonData.obj[index-1][name];
    else
      data = jsonData.obj[name];
      
      console.log(data);
    
    if(data == undefined)
    {
      if(jsonData.count >0)
        jsonData.data =  replaceAll(JSON.stringify(jsonData.obj[index-1]),"\"","").replace("{","").replace("}",""); 
      else
        jsonData.data =  replaceAll(JSON.stringify(jsonData.obj),"\"","").replace("{","").replace("}","");  
    }
    else
    {
      if(jsonData.count > 0)
      {
        if(data.$t != null)
          jsonData.data = data.$t;
        else
          jsonData.data = jsonData.obj[index-1][name];
      }
      else
        jsonData.data = jsonData.obj[name];
    }
    break;
  }

}

function getValueByKey(obj, fieldName)
{
  var keys = Object.keys(obj);
  console.log(keys);
  var values = Object.values(obj);
  console.log(values);
  for(var i=0;i<keys.length;i++)
  {
    if(keys[i] == fieldName)
      return values[i];
  }
  
  return replaceAll(JSON.stringify(jsonData.obj[index-1]),"\"","").replace("{","").replace("}",""); 
}

function getNewVersion() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "http://wf8266.com/wf8266r/api/ota/wfduino", true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      // JSON.parse does not evaluate the attacker's scripts.
      var resp = JSON.parse(xhr.responseText);
      ELE('version').innerText = resp.Version;
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
      //console.log(restfullGet);
    }
  }
  xhr.send();
}

function irSendHttp(pin, code) {
  if(isIRControl) return;

  var xhr = new XMLHttpRequest();
  isIRControl = true;
  irCode = "";
  xhr.open("GET", 'http://'+ ip + '/ir/send?pin=' + pin +'&code='+code, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      // JSON.parse does not evaluate the attacker's scripts.
      isIRControl = false;
    }
  }
  xhr.send();
}

function irGetHttp(pin) {

  var xhr = new XMLHttpRequest();
  xhr.open("GET", 'http://'+ ip + '/ir/code?pin=' + pin, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      // JSON.parse does not evaluate the attacker's scripts.
      var jsonObj = JSON.parse(xhr.responseText);
      irCode = jsonObj.code;
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
  blueDevice();
  getNewVersion();
  showMessage('Init...')
  var deviceType = document.getElementById('deviceType');
  var deviceList = document.getElementById('deviceList');
  var btnClose = ELE('btnClose');
  var btnScratchX = ELE('btnScratchX');
  var btnScratch = ELE('btnScratch');
  var btnFirmware = ELE('btnFirmware');
  var btnScratchTemplate = ELE('btnScratchTemplate');
  var btnHex = ELE('btnHex');
  var btnVirtual = ELE('isVirtual');
  
  var onGetPorts = function (ports) {
    var eligiblePorts = ports.filter(function (port) {
      //return (port.path.match(/\/dev\/tty/)) || port.path.match(/COM/);
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
  
  btnVirtual.onchange = function () {
    isCloud = btnVirtual.checked;
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
  
  btnScratch.onclick = function () {
    window.open('https://scratch.mit.edu/','scratch','');
  }
  
  btnScratchTemplate.onclick = function(){
    window.open('https://goo.gl/khTjBv','scratch','');
  }
  
  btnFirmware.onclick = function () {
    window.open('https://goo.gl/3Lbm0Q','WFduino','');
  }
  
  btnHex.onclick = function(){
    window.open('https://goo.gl/BTk0NP','WFduino','');
  }

  deviceType.onchange = function(){
    var type = deviceType.options[deviceType.selectedIndex].value;
    if(type == "Bluetooth")
    {
      deviceList.style.display = 'none';
      blueList.style.display = '';
    }
    else
    {
      deviceList.style.display = '';
      blueList.style.display = 'none';
    }
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
      speak('ScratchX connected');
      showMessage('ScratchX 已連接',true);
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
        speak('Disconnect from Scratch');
        showMessage('已中斷 Scratch 連線',true);
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
  else
  {
    if((new Date).getTime() - timeManager.lastResponse > 1000)
    {
      isConnectedWFduino = false;
      if(isCloud)
        isConnectedWFduino = true;
    }
  }

    
  switch(cmd)
  {
    case "reset_all" : send("reset\r\n");break;
    case "poll" : 
      if(!isConnectedWFduino)
        break;
      showMessage('Scratch2 已連接');   
      WFduinoType = 0; 
      timeManager.millis = (new Date).getTime();
      /*var readTimer = 200;
      if(isConnectedWF8266R)
        readTimer = 5000;
      if( (new Date).getTime() - timeManager.lastTime > readTimer)
      {
        timeManager.lastTime = (new Date).getTime();
        if(isConnectedWF8266R)
          sendWF8266R("wfduino,readGPIO");
        else
          send("readGPIO\r\n");
      }
      */
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
      +"\nreadSensor/RESTfulGET/Value "+encodeURI(restfullGet)
      +"\nreadSensor/LASS/Value "+lassData.PM25
      +"\nreadSensor/LASS/C "+lassData.C
      +"\nreadSensor/LASS/H "+lassData.H
      +"\nreadSensor/LASS/PM25 "+lassData.PM25
      +"\nreadSensor/Voice/Value "+encodeURI(voiceData.Text)
      +"\nvoiceText "+ encodeURI(voiceData.Text)
      +"\nwf8266rState "+ isConnectedWF8266R
      +"\njsonData "+encodeURI(jsonData.data)
      +"\njsonCount "+ jsonData.count
      +"\nwfircode "+ irCode
      ; 
      break;
    case "pinMode" :
        if (p2 == "INPUT")
            p2 = 0;
        else
            p2 = 1;

        send(cmd+"," + parseAPin(p1) + "=" + p2+"\r\n");break;
    case "digitalWrite" : send(cmd+"," + parseAPin(p1) + "=" + p2+"\r\n");break;
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
    case "http" : httpRequest(p1,p2); break; 
    case "json" : getJSON(p1,0); break;
    case "jsonRead" : getJSONRead(p1,p2); break;
    case "lass" : lass(p1); break;
    case "speak_text" : speak(decodeURI(p1)); break;
    case "speech_text" : speech_text(); break;
    case "flush" : voiceData.Text = ""; break;
    case "set_ip" : set_ip(p1); break;
    case "stopWF8266R" : stopWF8266R(); break;
    case "wfcsenservo" :
      if(isConnectedWF8266R)
        sendWF8266R("servo,pin=" + p1 + "&degree=" + p2);
      else
        send("wtsen,type=SERVO&"+p1+"="+p2+"\r\n");
      break;
    case "wfgpio" :
        if(decodeURI(p2)=="數位")
            p2 = "D";
        else
            p2 = "A";
        if(isConnectedWF8266R)
        {
            if(p2=="D")
                sendWF8266R("gpio," + p1 + "=" + p3);
            else
                sendWF8266R("gpio/pwm," + p1 + "=" + p3);
        }
        else
            send("wtgpio,type="+p2+"&"+p1+"="+p3+"\r\n");
        break;
    case "wfirsendCode" :
      if(isConnectedWF8266R)
      {
        if(p2.length > 8)
          irSendHttp(p1,p2);
        else
          sendWF8266R("ir/sendCode,pin=" + p1 + "&code=" + p2);
      }
      else
        send("wtirsc,type=IRSendCode&"+p1+"="+p2+"\r\n");
      break;
    case "wfirrecv" :
      if(isConnectedWF8266R)
      {
          irGetHttp(p1);
      }
      break;  
    default : break;
  }
  
  return message;
}

function parseAPin(pin)
{
  if(pin[0] == "A")
  {
    return pin.substring(3,5);
  }
  else
    return pin;
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
  else
  {
    document.getElementById('deviceType').disabled = false;
    isFirst = false;
    isConnectedWFduino = false;
    isVerchecked = false;
    ELE('aversion').innerText = "";
    newVersion="";
    arduinVersion="";
    arduinoCMD = "";
    for (var i = 0; i < connectedSockets.length; i++) {
      connectedSockets[i].close();
    }
    
    speak('WFDuino closed');
    setStatus('請選擇 USB 口連接 WFduino');
    connectionId = -1;
  }
}

function onOpen(openInfo) {
  document.getElementById('deviceType').disabled = true;
  connectionId = openInfo.connectionId;
  console.log("connectionId: " + connectionId);
  if (connectionId == -1) {
    setStatus('Could not open');
    isConnectedWFduino = false;
    return;
  }
  speak('WFduino connected');
  setStatus('WFduino 已連接');
  
  if(isFirst)
    chrome.serial.onReceive.addListener(onRead);
};

function send(cmd) { 
  if(!isConnectedWFduino)
    return;
  
  if( ((new Date).getTime() - timeManager.cmdTime < 150) && timeManager.lastCMD == cmd)
    return;
  
  timeManager.cmdTime = (new Date).getTime();  
  timeManager.lastCMD = cmd;
    
  console.log(cmd);
  
  if(isConnectedWF8266R)
  {
    cmd = "wfduino,"+cmd.replace(",",":").replace("=","~");
    sendWF8266R(cmd+"=");
  }
  else
  {
  if(connectionId == -1)
    return;
  var buffer = new ArrayBuffer(cmd.length);
  var uint8View = new Uint8Array(buffer);
  for (var i = 0; i < cmd.length; i++)
    uint8View[i] = cmd.charCodeAt(i);

    if(!isBluetooth)
    {
      chrome.serial.send(connectionId, buffer, function () { });
    }
    else
    {
      chrome.bluetoothSocket.send(connectionId, buffer, function (){ });
    }
  }
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
  timeManager.lastResponse = (new Date).getTime();
  console.log("UART Rx : " + backCMD);
  if (!isVerchecked) //version check
  {
    var index = backCMD.indexOf(".WFduino.Ready");
    if (index > 0) {
      backCMD = backCMD.replace(".WFduino.Ready", "");
      ELE('aversion').innerText = backCMD;
      arduinVersion = backCMD.replace('.','');
      backCMD = "";
      isVerchecked = true;
      isConnectedWFduino = true;
      if(newVersion > arduinVersion)
      {
        speak('Please update new firmware');
        setStatus('請更新最新版本的 Arduino 韌體');
        window.open('https://goo.gl/3Lbm0Q','scratchX','');
      }
    }
  }
  
  if (backCMD != "") {
    if(WFduinoType == 0) //Scratch2 HTTP
    {
      if(backCMD[0] != '{')
      {
        console.log("backCMD != {");
        return;
      }
      var json;
      
      try{
        json = JSON.parse(backCMD);
        
        switch(json.Action){
          case "readGPIO" : arduinoCMD = ""; var gpios = json.Value.split(','); 
            for(var i=0;i<Object.keys(gpio).length;i++)
                gpio[i] = gpios[i];
            break;
          case "distance" : distance = json.distance; break;
          default : break;
        }
      }
      catch(e)
      {
        console.log(e);
        arduinoCMD = "";
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
      speak('WFduino ready');
      showMessage('WFduino 服務器已就緒');
    });
    connection.addEventListener('close', function () {
      speak('WFduino closed');
      showMessage('WFduino 服務器已關閉');
    });
    connection.addEventListener('message', function (e) {
      var cmd = e.data;
      console.log(cmd);
      if(cmd.replace("\r\n","")=='speech_text')
      {
        speech_text();
      }
      else
        send(e.data);
    });

  }, 1e3);
});