(function (ext) {
    var ip = "";
    var isConnected = false;
    var connection;

    // Cleanup function when the extension is unloaded
    ext._shutdown = function () {

    };

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function () {
        if (isConnected) return { status: 2, msg: 'Ready' };
        if (!isConnected) return { status: 1, msg: '請設定開發板位址' };
    };

    ext.connect = function (ip, port) {
        socketConnection(ip, port);
    }

    ext.pinMode = function (pin, value) {
        if(value == "INPUT")
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
    ext.digitalRead = function (pin, value) {
        send("digitalRead," + pin + "=" + value);
    }
    ext.analogRead = function (pin, value) {
        send("analogRead," + pin + "=" + value);
    }

    function send(cmd) {
        connection.send(cmd+"\r\n");
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
            console.log(e);

        };
        connection.onerror = function (e) {
            isConnected = false;
        };
    }

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            [' ', 'WF %s:%n', 'connect', '127.0.0.1', 9999],
            [' ', '腳位 %d.gpio 模式設為 %m.mode', 'pinMode', 13, 'OUTPUT'],
            [' ', '腳位 %d.gpio 數位輸出 %m.level', 'digitalWrite', 13, 1],
            [' ', '腳位 %d.pwmGPIO 類比輸出 %n', 'analogWrite', 3, 255],
            ['r', '讀取類比腳位 %d.analogGPIO ', 'analogRead', 'A0'],
            ['r', '讀取數位腳位 %d.gpio ', 'dititalRead', 13],
        ],
        menus: {
            'mode': ['INPUT', 'OUTPUT'],
            'level': ['0', '1'],
            'pwmGPIO': ['3','5','6','9','10','11'],
            'analogGPIO': ['A0','A1','A2','A3','A4','A5'],
            'gpio': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
        },
        url: 'http://unumobile.github.io/wf8266r.js-scratchx-extensions'
    };

    // Register the extension
    ScratchExtensions.register('WF Arduino', descriptor, ext);
})({});