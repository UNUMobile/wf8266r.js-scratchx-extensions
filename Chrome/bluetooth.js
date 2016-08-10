
function blueDevice()
{
  var blueList = document.getElementById('blueList');
  
  chrome.bluetooth.getDevices(function (deviceInfos){
    console.log(deviceInfos);
    
    for(var i=0;i<deviceInfos.length;i++)
    {
      var device = document.createElement('option');
      device.text = device.innerText = deviceInfos[i].name + "["+deviceInfos[i].address+"]";
      device.value = deviceInfos[i].address+","+deviceInfos[i].uuids[0];
      if (i == 0)
        blueList.appendChild(document.createElement('option'));
      blueList.appendChild(device);
    }

    blueList.style.display = 'none';
  });

  blueList.onchange = function () {
    chrome.bluetoothSocket.create(function(createInfo) {
      var selectedBlue = blueList.options[blueList.selectedIndex].value;
      var param = selectedBlue.split(',');

      if(selectedBlue == "")
      {
        chrome.bluetoothSocket.disconnect(connectionId, function(){
          isBluetooth = false;
          isConnectedWFduino = false;
          console.log("Bluetooth disconnected");
          document.getElementById('deviceType').disabled = false;
        })

        return;
      }

      connectionId = createInfo.socketId;
      chrome.bluetoothSocket.connect(createInfo.socketId,
        param[0], param[1], onConnectedCallback);
    });
  }
}

var onConnectedCallback = function() {
  if (chrome.runtime.lastError) {
    console.log("Connection failed: " + chrome.runtime.lastError.message);
  } else {
    // Profile implementation here.
    console.log("Bluetooth connected");
    isBluetooth = true;
    isConnectedWFduino = true;
    ELE('aversion').innerText = "藍芽連接,請重啟Arduino";
    document.getElementById('deviceType').disabled = true;
  }
};

chrome.bluetoothSocket.onReceive.addListener(onRead);
