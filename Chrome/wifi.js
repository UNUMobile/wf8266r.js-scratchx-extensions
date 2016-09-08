var apName = "";
var isShowWiFiConfig = false;
var nodeIP = "";

function bindAP(wifiString)
{
  if(nodeIP == "0.0.0.0" || nodeIP == "")
    ELE('connarea').style.display = '';

  var wifiList = document.getElementById('wifiList');
  wifiList.length = 0;
  var deviceInfos = wifiString.split(",");
    
    for(var i=0;i<deviceInfos.length-1;i++)
    {
      var device = document.createElement('option');
      device.value = device.innerText = deviceInfos[i].split(':')[0];
      device.text = device.innerText = deviceInfos[i];
      
      if (i == 0)
      {
        wifiList.appendChild(document.createElement('option'));
        var rescan = document.createElement('option');
        rescan.value = "Refresh";
        rescan.text = chrome.i18n.getMessage("refresh");
        wifiList.appendChild(rescan);
      }
      wifiList.appendChild(device);
    }

     wifiList.onchange = function () {
       var selectedWiFi = wifiList.options[wifiList.selectedIndex].value;
       if(selectedWiFi == "Refresh")
       {
         wifiList.options[wifiList.selectedIndex].text = chrome.i18n.getMessage("searching");
        send("scanWiFi\r\n");
       }
     }
}

function setWiFi()
{
  var wifiList = ELE('wifiList');
  var wifiPassword = ELE('wifiPassword');
  var ssid = wifiList.options[wifiList.selectedIndex].value;
  var password = wifiPassword.value;

  send("connWiFi,"+ssid+"="+password+"\r\n");
  ELE('iparea').style.display = '';
  ELE('connarea').style.display = 'none';
  ELE('ip').innerText = chrome.i18n.getMessage("connecting");
}

function bindIP(data)
{
  ELE('iparea').style.display = '';
  nodeIP = data;

  if(data == "0.0.0.0")
  {
    ELE('connarea').style.display = '';
    ELE('ip').innerText = apName;
  }
  else
  {
    ELE('ip').innerText = data;
    ELE('connarea').style.display = 'none';
  }
    
}

function toggleWiFiConfig()
{
  isShowWiFiConfig = !isShowWiFiConfig;
  if(isShowWiFiConfig)
    ELE('connarea').style.display = '';
  else
    ELE('connarea').style.display = 'none';
}

function bindAPInfo(data)
{
  apName = data;
}


