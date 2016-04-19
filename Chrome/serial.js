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

onload = function () {
  getNewVersion();
  showMessage('Init...')
  var deviceList = document.getElementById('deviceList');
  var btnClose = $('btnClose');
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
      if (url == '/')
        url = '/index.html';
      // Serve the pages of this chrome application.
      req.serveUrl(url);
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

function setStatus(status) {
  document.getElementById('status').innerText = status;
}

function showMessage(msg) {
  document.getElementById('message').innerText = msg;
}

function openSelectedPort() {
  var deviceList = document.getElementById('deviceList');
  var selectedPort = deviceList.options[deviceList.selectedIndex].value;
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
  if (uint8View[uint8View.length - 1] == 10) {
    str = arduinoCMD + str;
    arduinoCMD = "";
    return str;
  }
  else {
    arduinoCMD = str;
    return "";
  }
}

function onRead(readInfo) {
  var backCMD = getCMD(readInfo.data);

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
        setStatus('Older firmware');
    }
  }

  if (backCMD != "") {
    for (var i = 0; i < connectedSockets.length; i++)
      connectedSockets[i].send(backCMD);
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