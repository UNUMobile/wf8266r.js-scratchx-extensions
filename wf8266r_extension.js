(function (ext) {
    var ip = "";
    var isConnected = false;
    var connection;
    var callbackEvent = [];
    var isUARTData = false;
    var uartData = "";
    var gpio = { D0: 0, D1: 0, D2: 0, D3: 0, D4: 0, D5: 0, D12: 0, D13: 0, D14: 0, D15: 0, D16: 0, ADC: 0 };
    var dhtData = { C: 0, F: 0, H: 0 };
    var dsData = { C: 0, F: 0 };
    var distance = 0;
    var irCode = "";
    var restfullGet = "";
    var lassData = { C: 0, H: 0, PM25: 0 };
    var pm25Data = {PM1:0, PM25:0, PM10:0};
    var voiceData = { Text: '' };
    var socketCounter = 0;
    var package = { send: 0, recv: 0, millis: 0 };
    var timeManager = { lastTime: 0, startTime: 0, millis: 0 };
    var rec = null;
    var isAutoOpen = false;
    var tft = {ip:"",relay:""};

    function sendCommand(cmd, checkTime) {
        timeManager.millis = (new Date).getTime();

        //console.log(cmd + " " + socketCounter);
        package.send++;
        if ((isConnected && socketCounter == 0) || checkTime == null) {
            if ((timeManager.millis - timeManager.lastTime) > 100 && checkTime == null) {
                timeManager.lastTime = (new Date).getTime();
                socketCounter++;
                connection.send(cmd);
            }
            else
            {
                socketCounter = 1;
                connection.send(cmd);
            }
        }

    }

    function sendIRHttp(pin, code) {
        $.ajax({
            url: 'http://'+ ip + '/ir/send?pin=' + pin +'&code='+code,
            success: function (data) {
                
            },
            error: function (e) {
            }
        });
    };

    function getIRHttp(pin) {
        $.ajax({
            url: 'http://'+ ip + '/ir/code?pin=' + pin,
            success: function (data) {
                var jsonObj = JSON.parse(data);
                irCode = jsonObj.code;
            },
            error: function (e) {
            }
        });
    };

    // Cleanup function when the extension is unloaded
    ext._shutdown = function () {
        //console.log("shutdown");
        socketCounter = 0;
        if (conncetion != null)
            connection.close();
    };

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function () {
        timeManager.millis = (new Date).getTime();
        if (isConnected) return { status: 2, msg: 'Ready' };
        if (!isConnected) return { status: 1, msg: '請設定開發板位址' };
    };

    ext.gpio = function (pin, value) {
        sendCommand("gpio," + pin + "=" + value);
    };

    ext.pwm = function (pin, value) {
        sendCommand("gpio/pwm," + pin + "=" + value);
    };

    ext.pinmode = function (pin, mode) {
        sendCommand("pinmode," + pin + "=" + mode);
    };

    ext.adc = function () {
        sendCommand("gpio/adc");
        return gpio.ADC;
    };

    ext.read = function (pin) {
        sendCommand("gpio/read," + pin + "=2");
        return eval('gpio.D' + pin);
    };

    ext.dht = function (type, pin, callback) {
        sendCommand("dht,pin=" + pin + "&type=" + type);
    };

    ext.ds = function (pin) {
        sendCommand("ds,pin=" + pin + "&index=1");
    };

    ext.distance = function (echo, trig) {
        sendCommand("distance,echo=" + echo + "&trig=" + trig);
    };

    ext.pm25 = function (type, pin) {

        if (type == "GP2Y1010AU0F") {
            sendCommand("pm25,pin=" + pin);
        }
        else if (type == "G3" || type == "G5") {
            sendCommand("pm25g");
        }

    };

    ext.irrecv = function (pin) {
        getIRHttp(pin);
        //sendCommand("ir/code,pin=" + pin);
        return irCode;
    };

    ext.irsend = function (pin, index) {
        sendCommand("ir/send,pin=" + pin + "&index=" + index);
    };

    ext.irsendCode = function (pin, code) {
        if(code.length > 8)
            sendIRHttp(pin, code);
        else
            sendCommand("ir/sendCode,pin=" + pin + "&code=" + code);
    };

    ext.irstop = function () {
        sendCommand("ir/stop");
    };

    ext.servo = function (pin, degree) {
        sendCommand("servo,pin=" + pin + "&degree=" + degree);
    };

    ext.car = function (leftF, leftFV, leftB, leftBV, rightF, rightFV, rightB, rightBV) {
        sendCommand("gpio," + leftF + "=" + leftFV, false);
        sendCommand("gpio," + leftB + "=" + leftBV, false);
        sendCommand("gpio," + rightF + "=" + rightFV, false);
        sendCommand("gpio," + rightB + "=" + rightBV, false);
    };

    ext.baud = function (rate) {
        sendCommand("baud," + rate + "=");
    };

    ext.tx = function (type, text, ln) {
        sendCommand("uart/tx,type=" + type + "&text=" + text + "&ln=" + ln);
    };

    ext.socketUART = function (state) {
        sendCommand("socketUART,state=" + state);
    };

    ext.flush = function (type) {
        switch (type) {
            case "UART": uartData = ""; isUARTData = false; break;
            case "Voice": voiceData.Text = "";
            default:
                break;
        }
    };

    ext.http = function (_type, uri, callback) {
        $.ajax({
            url: uri,
            type: _type,
            success: function (data) {
                callback(data);
                restfullGet = data;
            },
            error: function (e) {
                callback(e);
                restfullGet = JSON.stringify(e);
            }
        });
    };

    ext.lass = function (device) {
        $.ajax({
            url: 'http://nrl.iis.sinica.edu.tw/LASS/last.php?device_id=' + device,
            success: function (data) {
                var jsonObj = JSON.parse(data);
                //console.log(jsonObj);
                lassData.C = jsonObj.s_t0;
                lassData.H = jsonObj.s_h0;
                lassData.PM25 = jsonObj.s_d0;
                //callback(true);
            },
            error: function (e) {
                //callback(e);
            }
        });
    };

    ext.readSensor = function (type, param) {
        switch (type) {
            case "DHT":
                if (param == 'Value')
                    return dhtData.C;
                else
                    return eval('dhtData.' + param);
            case "DS":
                if (param == 'Value')
                    return dsData.C;
                else
                    return eval('dsData.' + param);
            case "HCSR": return distance;
            case "RESTfulGET": return restfullGet;
            case "IR": return irCode;
            case "Rx": return uartData;
            case "LASS":
                if (param == 'Value')
                    return lassData.PM25;
                else
                    return eval('lassData.' + param);
            case "Voice": return voiceData.Text;
            case "PM25":
                if (param == 'Value')
                    return pm25Data.PM25;
                else
                    return eval('pm25Data.' + param);
            default: break;
        }
    };

    ext.set_ip = function (_ip) {
        if (isConnected)
            return;
        ip = _ip;
        socketConnection(_ip);
    };

    ext.speak_text = function (text, callback) {
        var u = new SpeechSynthesisUtterance(text.toString());
        u.onend = function (event) {
            if (typeof callback == "function") callback();
        };

        speechSynthesis.speak(u);
    };
    
    ext.voiceText = function(){
        return voiceData.Text;
    }

    ext.speech_text = function (type) {
        if(type == 'true')
            isAutoOpen = true;
        else
            isAutoOpen = false;
            
        if (rec == null)
            rec = new webkitSpeechRecognition();

        rec.start();
        rec.continuous = true;
        rec.interimResults = true;
        var result = "";

        rec.onend = function () {
            //console.log("end");
            if(isAutoOpen)
                rec.start();
        }

        rec.onstart = function () {
            //console.log("start");
        }

        rec.onerror = function (event) {
            //console.log(event);
        }

        rec.onresult = function (event) {
            //console.log(event.results);
            if (typeof (event.results) == 'undefined') {
                rec.onend = null;
                rec.stop();
            }

            if (event.results.length > 0) {
                if (event.results[event.results.length - 1].isFinal)
                    voiceData.Text = event.results[event.results.length - 1][0].transcript;
            }
        }
    }

    ext.when_connected = function () {
        return isConnected;
    };

    ext.packageTotal = function () {
        return Math.round((package.recv / package.send) * 100);
    }

    ext.when_uart = function () {
        return isUARTData;
    };

    function socketConnection(ip) {
        timeManager.startTime = (new Date).getTime();
        connection = new WebSocket('ws://' + ip + ':81/api', ['wf8266r']);
        connection.onopen = function (e) {
            isConnected = true;
            sendCommand("socketUART,state=false");
            //sendCommand("gpio/adc");
        };
        connection.onclose = function (e) {
            isConnected = false;
        };
        connection.onmessage = function (e) {
            socketCounter--;
            package.recv++;
            isConnected = true;

            if (e.data.length == 1) // socket uart
            {
                isUARTData = true;
                uartData += e.data;
                return;
            }

            var jsonObj = JSON.parse(e.data.substring(0, e.data.length - 1));

            //console.log(jsonObj);
            switch (jsonObj.Action) {
                case "gpio/adc": gpio.ADC = jsonObj.ADC; break;
                case "gpio/read": eval('gpio.D' + jsonObj.Pin + '=' + jsonObj.Value); break;
                case "dht":
                    dhtData.C = parseFloat(jsonObj.C); dhtData.H = parseFloat(jsonObj.Humidity); dhtData.F = parseFloat(jsonObj.F); break;
                case "ds1":
                    dsData.C = parseFloat(jsonObj.C); dsData.F = parseFloat(jsonObj.F); break;
                case "distance":
                    distance = parseInt(jsonObj.distance); break;
                case "pm25": 
                    pm25Data.PM25 = jsonObj.PM25; break;
                case "pm25g": pm25Data.PM1 = jsonObj.PMAT10; pm25Data.PM25 = jsonObj.PMAT25; pm25Data.PM10 = jsonObj.PMAT100;  
                    break;
                case "ir/code":
                    irCode = jsonObj.code; break;
                case "ir/send": break;
                case "ir/stop": break;
                default: break;
            }

        };
        connection.onerror = function (e) {
            isConnected = false;
        };
    }

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            [' ', '開發板位址 %s', 'set_ip', 'mywfXXXX.local'],
            ['h', '當連線建立時', 'when_connected'],
            ['r', '連線品質', 'packageTotal'],

            [' ', '腳位 %d.gpio 模式設為 %m.mode', 'pinmode', 5, 'OUTPUT'],
            [' ', '腳位 %d.gpio 數位輸出 %m.level', 'gpio', 5, 1],
            [' ', '腳位 %d.gpio 類比輸出 %n', 'pwm', 5, 1023],
            [' ', 'LASS 設備編號 %s', 'lass', ''],
            [' ', 'DHT%m.dhtType 溫濕度感測器 在腳位 %d.gpio', 'dht', 11, 12],
            [' ', 'DS18B20 溫度感測器 在腳位 %d.gpio', 'ds', 4],
            [' ', 'HCSR 超音波感測器，Echo 在腳位 %d.gpio Trig 在腳位 %d.gpio', 'distance', 5, 4],
            [' ', 'PM25粉塵感測器 %m.pm25SensorParam 在腳位 %d.gpio', 'pm25', 'G3', 14],
            [' ', '伺服馬達在腳位 %d.gpio 轉動角度為 %n 度', 'servo', 5, 90],
            [' ', '小車馬達 左前 %d.gpio 輸出 %m.level 左後 %d.gpio 輸出 %m.level 右前 %d.gpio 輸出 %m.level 右後 %d.gpio 輸出 %m.level', 'car', 5, 0, 4, 0, 12, 0, 13, 0],
            ['h', '當UART有資料時', 'when_uart'],
            [' ', 'UART 速率 %m.uartBaud', 'baud', '115200'],
            [' ', 'UART to Socket %m.boolType', 'socketUART', 'true'],
            [' ', 'UART Tx 送出 %m.uartCode %s 結尾換行 %m.boolType', 'tx', 'text', 'Hi', 'true'],
            [' ', '%m.flushType 清空', 'flush', 'UART'],
            ['w', 'HTTP %m.restfulType 到 %s', 'http', 'POST', 'http://api.thingspeak.com/update?key=xxxxxx&field1=1&field2=2'],
            ['w', 'HTTP %m.restfulType 從 %s', 'http', 'GET', 'http://api.thingspeak.com/apps/thinghttp/send_request?api_key=EM18B52PSHXZB4DD'],
            ['w', '說 %s', 'speak_text', 'Scratch 遇上 WF8266R'],
            [' ', '監聽語音, 自動啟用設為 %m.boolType', 'speech_text', 'false'],
            ['r', '語音文字', 'voiceText'],

            [' ', '紅外線發射器，接在腳位 %d.gpio 發送位址 %n 的資料', 'irsend', 15, 0],
            [' ', '紅外線發射器，接在腳位 %d.gpio 發送編碼 %s', 'irsendCode', 15, ''],
            [' ', '停止紅外線接收', 'irstop'],
            ['r', '讀取紅外線接收器，接在腳位 %d.gpio', 'irrecv', 14],
            ['r', '讀取數位腳位 %d.gpio', 'read', 5],
            ['r', '讀取類比腳位 ADC', 'adc'],
            ['r', '讀取感測器 %m.sensor 參數 %m.sensorParam', 'readSensor', 'DHT', 'Value'],

        ],
        menus: {
            'mode': ['INPUT', 'OUTPUT'],
            'sensor': ['DHT', 'DS', 'HCSR', 'IR', 'Rx', 'RESTfulGET', 'LASS', 'Voice', 'PM25'],
            'sensorParam': ['Value', 'C', 'F', 'H', 'PM1', 'PM25', 'PM10'],
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
            'gpio': ['5', '4', '12', '13', '14', '15', '16', '0', '1', '2', '3'],
        },
        url: 'http://unumobile.github.io/wf8266r.js-scratchx-extensions'
    };

    // Register the extension
    ScratchExtensions.register('WF8266R', descriptor, ext);
})({});