(function (ext) {
    var ip = "";
    var isConnected = false;
    var connection;
    var gpio = { D0: 0, D1: 0, D2: 0, D3: 0, D4: 0, D5: 0, D6: 0, D7: 0, D8: 0, D9: 0, D10: 0, D11: 0, D12: 0, D13: 0, A0: 0, A1: 0, A2: 0, A3: 0, A4: 0, A5: 0 };

    // Cleanup function when the extension is unloaded
    ext._shutdown = function () {

    };

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function () {
        if (isConnected) return { status: 2, msg: 'Ready' };
        if (!isConnected) return { status: 1, msg: '請設定開發板位址' };
    };

    ext.connect = function () {
        if(!isConnected)
            socketConnection("127.0.0.1", 9999);
    }

    ext.pinMode = function (pin, value) {
        if (value == "INPUT")
            value = 0;
        else
            value = 1;
        send("pinMode," + pin + "=" + value);
    }
    ext.digitalWrite = function (pin, value) {
        send("digitalWrite," + pin + "=" + value);
    }
    ext.analogWrite = function (pin, value) {
        send("analogWrite," + pin + "=" + value);
    }
    ext.digitalRead = function (pin) {
        send("digitalRead," + pin + "=");
        var v=0;
        eval('v=gpio.D'+pin);
        return v;
    }
    ext.analogRead = function (pin) {
        send("analogRead," + pin + "=");
        var v=0;
        eval('v=gpio.A'+pin.replace("A",""));
        return v;
    }

    function send(cmd) {
        connection.send(cmd + "\r\n");
    }

    function socketConnection(ip, port) {
        connection = new WebSocket('ws://' + ip + ':' + port);
        connection.onopen = function (e) {
            isConnected = true;
        };
        connection.onclose = function (e) {
            isConnected = false;
        };
        connection.onmessage = function (e) {
            console.log(e.data);
            if(e.data[0] != "{")
                return;
                
            var jsonObj = JSON.parse(e.data.substring(0, e.data.length - 1));
            switch (jsonObj.Action) {
                case "digitalRead": eval('gpio.D'+jsonObj.Pin+'='+jsonObj.Value); break;
                case "analogRead": eval('gpio.A'+jsonObj.Pin+'='+jsonObj.Value); break;
                default:break;
            }
        };
        connection.onerror = function (e) {
            isConnected = false;
        };
    }

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            [' ', '連接 WF Arduino', 'connect'],
            [' ', '腳位 %d.gpio 模式設為 %m.mode', 'pinMode', 13, 'OUTPUT'],
            [' ', '腳位 %d.gpio 數位輸出 %m.level', 'digitalWrite', 13, 1],
            [' ', '腳位 %d.pwmGPIO 類比輸出 %n', 'analogWrite', 3, 255],
            ['r', '讀取類比腳位 %d.analogGPIO ', 'analogRead', 'A0'],
            ['r', '讀取數位腳位 %d.gpio ', 'digitalRead', 13],
        ],
        menus: {
            'mode': ['INPUT', 'OUTPUT'],
            'level': ['0', '1'],
            'pwmGPIO': ['3', '5', '6', '9', '10', '11'],
            'analogGPIO': ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
            'gpio': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
        },
        url: 'http://unumobile.github.io/wf8266r.js-scratchx-extensions'
    };

    // Register the extension
    ScratchExtensions.register('WF Arduino', descriptor, ext);
})({});