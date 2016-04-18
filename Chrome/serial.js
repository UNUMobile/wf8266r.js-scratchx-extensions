var connectionId = -1;
var readBuffer = "";
var port = 9999;
var connectedSockets = [];
var isServer = false;
var connection;
var arduinoCMD = "";

function $(id) {
  return document.getElementById(id);
}

onload = function () {
  var deviceList = document.getElementById('deviceList');
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
    var server = new http.Server();
    var wsServer = new http.WebSocketServer(server);
    server.listen(port);
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
      console.log('Client connected');
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
        console.log('Client disconnected');
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
  if (uint8View[uint8View.length-1] == 10) {
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
  console.log(backCMD);
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
      console.log('Connected');
    });
    connection.addEventListener('close', function () {
      console.log('Connection lost');
    });
    connection.addEventListener('message', function (e) {
      console.log(e.data);
      send(e.data);
    });

  }, 1e3);
});