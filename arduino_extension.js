(function (ext) {
    var ip = "";
    var isConnected = false;
    var connection;
    var gpio = { D0: 0, D1: 0, D2: 0, D3: 0, D4: 0, D5: 0, D6: 0, D7: 0, D8: 0, D9: 0, D10: 0, D11: 0, D12: 0, D13: 0, A0: 0, A1: 0, A2: 0, A3: 0, A4: 0, A5: 0 };
    var restfullGet = "";
    var lassData = { C: 0, H: 0, PM25: 0 };
    var voiceData = { Text: '' };
    var distance = 0;
    var rec = null;
    var isAutoOpen = false;

    // Cleanup function when the extension is unloaded
    ext._shutdown = function () {

    };

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function () {
        if (isConnected) return { status: 2, msg: 'Ready' };
        if (!isConnected) return { status: 1, msg: '請開啟 WFduino App' };
    };

    ext.connect = function () {
        if (!isConnected)
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
        var v = 0;
        eval('v=gpio.D' + pin);
        return v;
    }
    ext.analogRead = function (pin) {
        send("analogRead," + pin + "=");
        var v = 0;
        eval('v=gpio.A' + pin);
        return v;
    }

    ext.distance = function (echo, trig) {
        send("distance,echo=" + echo + "&trig=" + trig);
    };
    ext.servo = function (pin, degree) {
        send("servo,pin=" + pin + "&degree=" + degree);
    };
    ext.tone = function (pin, frequency, duration) {
        var fre = frequency.split(',')[1];
        send("tone,pin=" + pin + "&" + parseInt(fre) + "=" + duration);
    };
    ext.noTone = function (pin) {
        send("notone,pin=" + pin);
    };
    ext.wfgpio = function(pin, type, value){
        if(type=="數位")
            type = "D";
        else
            type = "A";
        send("wtgpio,type="+type+"&"+pin+"="+value);
    }
    ext.wfcsenservo = function(pin,degree){
        send("wtsen,type=SERVO&"+pin+"="+degree);
    }
    ext.flush = function (type) {
        switch (type) {
            case "Voice": voiceData.Text = "";
            default:
                break;
        }
    };
    ext.readSensor = function (type, param) {
        switch (type) {
            case "HCSR": return distance;
            case "RESTfulGET": return restfullGet;
            case "LASS":
                if (param == 'Value')
                    return lassData.PM25;
                else
                    return eval('lassData.' + param);
            case "Voice": return voiceData.Text;
            default: break;
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
    
    ext.speak_text = function (text, callback) {
        var u = new SpeechSynthesisUtterance();
        u.text = text.toString(); 
        u.onend = function (event) {
            if (typeof callback == "function") callback();
        };

        speechSynthesis.speak(u);
    };

    ext.voiceText = function () {
        return voiceData.Text;
    }

    ext.speech_text = function (type) {
        if(type=="True")
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
            if (e.data[0] != "{")
                return;

            var jsonObj = JSON.parse(e.data.substring(0, e.data.length - 1));
            switch (jsonObj.Action) {
                case "digitalRead": eval('gpio.D' + jsonObj.Pin + '=' + jsonObj.Value); break;
                case "analogRead": eval('gpio.A' + jsonObj.Pin + '=' + jsonObj.Value); break;
                case "distance": distance = jsonObj.distance; break;
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
            [' ', '連接 WFduino', 'connect'],
            [' ', 'test腳位 %d.gpio 模式設為 %m.mode', 'pinModetest', 13, 'OUTPUT'],
            [' ', '腳位 %d.gpio 模式設為 %m.mode', 'pinMode', 13, 'OUTPUT'],
            [' ', '腳位 %d.gpio 數位輸出 %m.level', 'digitalWrite', 13, 1],
            [' ', '腳位 %d.pwmGPIO 類比輸出 %n', 'analogWrite', 3, 255],
            ['w', 'HTTP %m.restfulType 到 %s', 'http', 'POST', 'http://api.thingspeak.com/update?key=xxxxxx&field1=1&field2=2'],
            ['w', 'HTTP %m.restfulType 從 %s', 'http', 'GET', 'http://api.thingspeak.com/apps/thinghttp/send_request?api_key=EM18B52PSHXZB4DD'],
            [' ', 'LASS 設備編號 %s', 'lass', ''],
            [' ', 'HCSR 超音波感測器，Echo 在腳位 %d.gpio Trig 在腳位 %d.gpio', 'distance', 5, 4],
            [' ', 'SERVO 伺服馬達，接在腳位 %d.gpio 轉 %n 度', 'servo', 5, 90],
            [' ', 'Tone 音調，接在腳位 %d.gpio 頻率 %d.tone 時長 %n', 'tone', 5, 'C,523', 1000],
            [' ', '關閉 Tone 音調，接在腳位 %d.gpio', 'noTone', 5],
            [' ', '%m.flushType 清空', 'flush', 'Voice'],
            ['w', '說 %s', 'speak_text', 'ScratchX 遇上 WFduino'], 
            [' ', '監聽語音, 自動啟動設為 %m.bool', 'speech_text','False'],
            [' ', 'WF8266R 腳位 %d.wfgpio %m.wfgpioType 輸出 %n', 'wfgpio', 5, '數位', 1],
            [' ', 'WF8266R SERVO 伺服馬達腳位 %d.wfgpio 轉 %n 度', 'wfcsenservo', 5, 90],
            ['r', '語音文字', 'voiceText'],
            ['r', '讀取類比腳位 A%d.analogGPIO ', 'analogRead', '0'],
            ['r', '讀取數位腳位 %d.gpio ', 'digitalRead', 13],
            ['r', '讀取感測器 %m.sensor 參數 %m.sensorParam', 'readSensor', 'Voice', 'Value'],
        ],
        menus: {
            'mode': ['INPUT', 'OUTPUT'],
            'bool': ['True', 'False'],
            'sensor': ['HCSR', 'RESTfulGET', 'LASS', 'Voice'],
            'sensorParam': ['Value', 'C', 'F', 'H', 'PM25'],
            'level': ['0', '1'],
            'flushType': ['Voice'],
            'pwmGPIO': ['3', '5', '6', '9', '10', '11'],
            'analogGPIO': ['0', '1', '2', '3', '4', '5', '6', '7'],
            'restfulType': ['GET', 'POST'],
            'gpio': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
            'tone':['C,523','C#,554','D,587','D#,622','E,659','F,698','F#,740','G,784','G#,831','A,880','A#,932','B,988'],
            'wfgpio': ['5', '4', '12', '13', '14', '15', '16', '0', '1', '2', '3'],
            'wfgpioType':['數位','類比']
        },
        url: 'http://unumobile.github.io/wf8266r.js-scratchx-extensions'
    };

    // Register the extension
    ScratchExtensions.register('WF8266 Arduino', descriptor, ext);
})({});