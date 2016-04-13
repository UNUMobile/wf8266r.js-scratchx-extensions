(function(ext) {
    var ip = "";
    var isConnected = false;
    var connection;
    var callbackEvent = [];
    var isUARTData = false;
    var uartData = "";
    var dhtData = {C:0, F:0, H:0}; 
    var dsData = {C:0,F:0};
    var distance = 0;
    var restfullGet = "";
    var lassData = {C:0, H:0, PM25:0};
    var socketCounter = 0;
    
    function sendCommand(cmd)
    {
        console.log(cmd + " " + socketCounter);
        
        if(isConnected && socketCounter == 0)
        {
            socketCounter++;
            connection.send(cmd);
        }
    }
    
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {
        console.log("shutdown");
    };

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        if(isConnected) return {status: 2, msg: 'Ready'};
        if(!isConnected) return {status: 1, msg: '請設定開發板位址'};
    };
    
    ext.gpio = function(pin,value){
        sendCommand("gpio,"+pin+"="+value);
    };
    
    ext.pwm = function(pin,value){
        sendCommand("gpio/pwm,"+pin+"="+value);
    };
    
    ext.pinmode = function(pin, mode){
        sendCommand("pinmode,"+pin+"="+mode);
    };
    
    ext.adc = function(callback){
        sendCommand("gpio/adc");
        var currentCallback = {action:'gpio/adc', index:'20', event:callback};
        callbackEvent.push(currentCallback);
    };
    
    ext.read = function(pin, callback){
        sendCommand("gpio/read,"+pin+"=2");
        var currentCallback = {action:'gpio/read', index:pin, event:callback};
        callbackEvent.push(currentCallback);
    };
    
    ext.dht = function(type, param, pin, callback){
        sendCommand("dht,pin="+pin+"&type="+type);
        var currentCallback = {action:'dht', index:param, event:callback};
        callbackEvent.push(currentCallback);
    };
    
    ext.ds = function(param, pin, callback){
        sendCommand("ds,pin="+pin+"&index=1");
        var currentCallback = {action:'ds1', index:param, event:callback};
        callbackEvent.push(currentCallback);
    };
    
    ext.distance = function(echo, trig, callback){
        sendCommand("distance,echo="+echo+"&trig="+trig);
        var currentCallback = {action:'distance', index:'distance', event:callback};
        callbackEvent.push(currentCallback);
    };
    
    ext.pm25 = function(type, pin, callback){
        var currentCallback;
        if(type == "GP2Y1010AU0F")
        {
            sendCommand("pm25,pin="+pin);
            currentCallback = {action:'pm25', index:'PM25', event:callback};
        }
        else if(type == "G3" || type == "G5")
        {
            sendCommand("pm25g");
            currentCallback = {action:'pm25g', index:'PMAT25', event:callback};
        }
        
        callbackEvent.push(currentCallback);
    };
    
    ext.irrecv = function(pin, callback) {
        sendCommand("ir/code,pin="+pin);
        var currentCallback = {action:'ir/code', index:'code', event:callback};
        callbackEvent.push(currentCallback);
    };
    
    ext.irsend = function(pin, index, callback) {
        sendCommand("ir/send,pin="+pin+"&index="+index);
        var currentCallback = {action:'ir/send', index:'index', event:callback};
        callbackEvent.push(currentCallback);
    };
    
    ext.irstop = function(callback) {
        sendCommand("ir/stop");
        var currentCallback = {action:'ir/stop', index:'state', event:callback};
        callbackEvent.push(currentCallback);
    };
    
    ext.baud = function(rate) {
        sendCommand("baud,"+rate+"=");    
    };
    
    ext.tx = function(type, text, ln) {
        sendCommand("uart/tx,type="+type+"&text="+text+"&ln="+ln);    
    };
    
    ext.rx = function(){
        return uartData;
    };
    
    ext.socketUART = function(state){
        sendCommand("socketUART,state="+state);
    };
    
    ext.flush = function(type){
        switch (type) {
            case "UART": uartData = ""; isUARTData = false; break;
            default:
                break;
        }
    };
    
    ext.http = function(_type, uri, callback){
        $.ajax({
              url: uri,
              type: _type,
              success: function( data ) {
                  callback(data);
              },
              error: function(e){
                  callback(e);
              }
        });
    };
    
    ext.lass = function(device, callback){
        $.ajax({
              url: 'http://nrl.iis.sinica.edu.tw/LASS/last.php?device_id='+device,
              success: function( data ) {
                  var jsonObj = JSON.parse(data);
                  console.log(jsonObj);
                  lass.C = jsonObj.s_t0;
                  lass.H = jsonObj.s_h0;
                  lass.PM25 = jsonObj.s_d0;
                  callback(true);
              },
              error: function(e){
                  callback(e);
              }
        });
    };
    
    ext.readSensor = function(type, param){
        switch(type)
        {
            case "DHT" : return eval('dhtData.'+param);
            case "DS" : return eval('dsData.'+param);
            case "HCSR" : return distance;
            case "RESTfulGET" : return restfullGet;
            case "LASS" : return eval('lassData.'+param);
            default : break;
        }
    };
    
    ext.set_ip = function(_ip){
        if(connection != null)
            connection.close(); 
        ip = _ip;
        socketConnection(_ip);
    };
    
    ext.when_connected = function(){
      return isConnected;  
    };
    
    ext.when_uart = function(){
      return isUARTData;  
    };

    function socketConnection(ip){
        connection = new WebSocket('ws://'+ ip +':81/api', ['wf8266r']);
        connection.onopen = function (e) {
            isConnected = true; 
            sendCommand("gpio/adc");
        };
        connection.onclose = function (e) {
            isConnected = false;
        };
        connection.onmessage = function (e) {
            socketCounter--;
            isConnected = true;
            
            if(e.data.length == 1) // socket uart
            {
                isUARTData = true;
                uartData += e.data;
                return;
            }
            
            var jsonObj = JSON.parse(e.data.substring(0, e.data.length - 1));
            var index = callbackEvent.length;
            var currentCallback;
            if(index > 0)
            {
                currentCallback = callbackEvent[0];
                if(currentCallback.action == jsonObj.Action)
                    callbackEvent.splice(0, 1);
            }
            else
                return;
              
console.log(jsonObj);
            switch(jsonObj.Action)
            {
                case "gpio/adc" : currentCallback.event(parseInt(jsonObj.ADC)); break;
                case "gpio/read" : currentCallback.event(parseInt(eval('jsonObj.D'+currentCallback.index))); break;
                case "dht" : currentCallback.event(parseFloat(eval('jsonObj.'+currentCallback.index))); 
                    dhtData.C = parseFloat(jsonObj.C); dhtData.H = parseFloat(jsonObj.Humidity); dhtData.F = parseFloat(jsonObj.F); break;
                case "ds1" : currentCallback.event(parseFloat(eval('jsonObj.'+currentCallback.index))); 
                    dsData.C = parseFloat(jsonObj.C); dstData.F = parseFloat(jsonObj.F); break;
                case "distance" : currentCallback.event(parseInt(eval('jsonObj.'+currentCallback.index))); 
                    distance = parseInt(jsonObj.distance); break;
                case "pm25" : currentCallback.event(parseInt(eval('jsonObj.'+currentCallback.index))); break;
                case "pm25g" : currentCallback.event(parseInt(eval('jsonObj.'+currentCallback.index))); break;
                case "ir/code" : currentCallback.event(eval('jsonObj.'+currentCallback.index)); break;
                case "ir/send" : currentCallback.event(eval('jsonObj.'+currentCallback.index)); break;
                case "ir/stop" : currentCallback.event(eval('jsonObj.'+currentCallback.index)); break;
                default : break;
            }
            
        };
        connection.onerror = function (e) {
            isConnected = false;
        };
    }
    
    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            [' ', '開發板位址 %s', 'set_ip', 'mywfxxxx.local'],
            ['h', '當連線建立時', 'when_connected'],
            ['h', '當UART有資料時', 'when_uart'],
            [' ', '腳位 %d.gpio 模式設為 %m.mode', 'pinmode',5,'OUTPUT'],
            [' ', '腳位 %d.gpio 數位輸出 %m.level', 'gpio',5,1],
            [' ', '腳位 %d.gpio 類比輸出 %n', 'pwm', 5, 1023],
            [' ', 'UART 速率 %m.uartBaud' ,'baud', '115200'],
            [' ', 'UART to Socket %m.boolType' ,'socketUART', 'true'],
            [' ', 'UART Tx 送出 %m.uartCode %s 結尾換行 %m.boolType' ,'tx', 'text', 'Hi', 'true'],
            [' ', '%m.flushType 清空', 'flush', 'UART'], 
            ['w', 'DHT%m.dhtType 溫濕度感測器 %m.dhtSensorParam 在腳位 %d.gpio' ,'dht', 11,'C', 12],
            ['w', 'DS18B20 溫度感測器 %m.dsSensorParam 在腳位 %d.gpio' ,'ds', 'C', 4],
            ['w', 'HCSR 超音波感測器，Echo 在腳位 %d.gpio Trig 在腳位 %d.gpio' ,'distance', 5,4],
            ['w', 'PM25粉塵感測器 %m.pm25SensorParam 在腳位 %d.gpio' ,'pm25', 'G3', 14],
            ['w', '讀取紅外線接收器，接在腳位 %d.gpio' ,'irrecv', 14],
            ['w', '紅外線發射器，接在腳位 %d.gpio 發送位址 %n 的資料' ,'irsend', 15, 0],
            ['w', '停止紅外線接收' ,'irstop'],
            ['w', 'HTTP %m.restfulType 到 %s' ,'http', 'POST', 'http://api.thingspeak.com/update?key=xxxxxx&field1=1&field2=2'],
            ['w', 'HTTP %m.restfulType 從 %s' ,'http', 'GET', 'http://api.thingspeak.com/apps/thinghttp/send_request?api_key=EM18B52PSHXZB4DD'],
            ['w', 'LASS 設備編號 %s' ,'lass', ''],
            ['R', '讀取數位腳位 %d.gpio' ,'read', 5],
            ['R', '讀取類比腳位 ADC','adc'],
            ['R', '讀取感測器 %m.sensor 參數 %m.sensorParam', 'readSensor', 'DHT','C'],
            ['r', '讀取 UART','rx'],
            ['r', 'LASS PM25','lassPM25'],
            ['r', 'LASS 溫度','lassC'],
            ['r', 'LASS 濕度','lassH'],
        ],
        menus: {
            'mode':['INPUT','OUTPUT'],
            'sensor':['DHT','DS','HCSR','IR','Rx','RESTfulGET','LASS'],
            'sensorParam':['Value','C','F','H','PM25'],
            'dhtSensorParam':['C','F','Humidity'],
            'dsSensorParam':['C','F'],
            'pm25SensorParam':['G3','G5','GP2Y1010AU0F'],
            'dhtType':['11','22','21'],
            'restfulType':['GET','POST'],
            'flushType':['UART'],
            'level':['0','1'],
            'uartCode':['text','hex'],
            'uartBaud':['9600','19200','38400','57600','115200'],
            'boolType':['true','false'],
            'gpio':['5','4','12','13','14','15','16','0','1','2','3']
        },
        url: 'http://unumobile.github.io/wf8266r.js-scratchx-extensions'
    };

    // Register the extension
    ScratchExtensions.register('WF8266R JS', descriptor, ext);
})({});