(function(ext) {
    var ip = "";
    var isConnected = false;
    var connection;
    
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        if(isConnected) return {status: 2, msg: 'Ready'};
        if(!isConnected) return {status: 1, msg: '請設定開發皮位址'};
    };
    
    ext.gpio = function(pin,value){
        console.log(pin + " " + value);
        connection.send("gpio,"+pin+"="+value);
    };

    function socketConnection(ip){
        connection = new WebSocket('ws://'+ ip +':81/api', ['wf8266r']);
        connection.onopen = function (e) {
            isConnected = true;  
            console.log("ok");
            connection.send("gpio/adc");
        };
        connection.onclose = function (e) {
            //連線關閉
        };
        connection.onmessage = function (e) {
            //收到來自 WF8266R 的訊息
            console.log(e.data);
        };
        connection.onerror = function (e) {
            //不明的錯誤
        };
    }

    ext.set_ip = function(text){
        ip = text;
        socketConnection(text);
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            [' ', '開發板位址 %s', 'set_ip', 'mywf9441.local'],
            [" ", "腳位 %d.gpio 模式設為 %m.mode", "pinmode",5,"OUTPUT"],
            [" ", "腳位 %d.gpio 數位輸出 %m.level", "gpio",5,1],
            [" ", "腳位 %d.gpio 類比輸出 %n", "pwm", 5, 1023],
            [" ", "DHT%m.dhtType 溫濕度感測器，接在腳位 %d.gpio" ,"dht", 11,12],
            [" ", "DS18B20 溫度感測器，接在腳位 %d.gpio" ,"ds", 4],
            [" ", "UART 速率 %m.uartBaud" ,"baud", "115200"],
            [" ", "HCSR 超音波感測器，Echo 在腳位 %d.gpio Trig 在腳位 %d.gpio" ,"distance", 5,4],
            [" ", "紅外線接收器，接在腳位 %d.gpio" ,"irrecv", 14],
            [" ", "紅外線發射器，接在腳位 %d.gpio 發送資料 %s" ,"irsend", 15, "0"],
            [" ", "停止紅外線接收" ,"irstop"],
            [" ", "UART Tx 送出 %m.uartCode %s 結尾換行 %m.boolType" ,"tx", "text", "Hi", "true"],
            [" ", "%m.flushType 清空", "flush", "UART"],
            [" ", "HTTP %m.restfulType 資料 %s 到 %s %s" ,"http", "POST", "key=xxxxxx&field1=1&field2=2","api.thingspeak.com", "update"],
            [" ", "HTTP %m.restfulType 資料 %s 從 %s %s" ,"http", "GET", "api_key=EM18B52PSHXZB4DD", "api.thingspeak.com", "apps/thinghttp/send_request"],
            ["r", "讀取數位腳位 %d.gpio" ,"read", 5],
            ["r", "讀取感測器 %m.sensor 參數 %m.sensorParam" ,"sensor", "DHT", "C"],
            ["r", "讀取類比腳位 ADC","adc"],
        ],
        menus: {
            "mode":["INPUT","OUTPUT"],
            "sensor":["DHT","DS","HCSR","IR","Rx","RESTfulGET"],
            "sensorParam":["Value","C","F","H"],
            "dhtType":["11","22","21"],
            "restfulType":["GET","POST"],
            "flushType":["UART","RESTful","IR"],
            "level":["0","1"],
            "uartCode":["text","hex"],
            "uartBaud":["9600","19200","38400","57600","115200"],
            "boolType":["true","false"],
            "gpio":["5","4","12","13","14","15","16","0","1","2","3"]
        },
    };

    // Register the extension
    ScratchExtensions.register('WF8266R', descriptor, ext);
})({});