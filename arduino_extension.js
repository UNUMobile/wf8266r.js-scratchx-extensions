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
        timeManager.millis = (new Date).getTime();
        if (isConnected) return { status: 2, msg: 'Ready' };
        if (!isConnected) return { status: 1, msg: '請設定開發板位址' };
    };

    ext.connect = function (ip, port) {
        socketConnection(ip, port);
    }


    function socketConnection(ip, port) {
        timeManager.startTime = (new Date).getTime();
        connection = new WebSocket('ws://' + ip + ':' + port);
        connection.onopen = function (e) {
            isConnected = true;
            sendCommand("hello arduino");
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


        ],
        menus: {
            'mode': ['INPUT', 'OUTPUT'],
            'sensor': ['DHT', 'DS', 'HCSR', 'IR', 'Rx', 'RESTfulGET', 'LASS', 'Voice'],
            'sensorParam': ['Value', 'C', 'F', 'H', 'PM25'],
            'dhtSensorParam': ['C', 'F', 'Humidity'],
            'dsSensorParam': ['C', 'F'],
            'pm25SensorParam': ['G3', 'G5', 'GP2Y1010AU0F'],
            'dhtType': ['11', '22', '21'],
            'restfulType': ['GET', 'POST'],
            'flushType': ['UART', 'Voice'],
            'level': ['0', '1'],
            'uartCode': ['text', 'hex'],
            'uartBaud': ['9600', '19200', '38400', '57600', '115200'],
            'boolType': ['true', 'false'],
            'gpio': ['5', '4', '12', '13', '14', '15', '16', '0', '1', '2', '3']
        },
        url: 'http://unumobile.github.io/wf8266r.js-scratchx-extensions'
    };

    // Register the extension
    ScratchExtensions.register('WF Arduino', descriptor, ext);
})({});