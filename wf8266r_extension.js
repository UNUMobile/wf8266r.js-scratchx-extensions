(function(ext) {
    var ip = "";
    var connection;
    
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    function socketConnection(ip){
        connection = new WebSocket('ws://'+ ip +':81/api', ['wf8266r']);
        connection.onopen = function (e) {
            //連線成功        
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
        ]
    };

    // Register the extension
    ScratchExtensions.register('WF8266R', descriptor, ext);
})({});