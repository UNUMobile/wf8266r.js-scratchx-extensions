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
    //WF8266R
    var isConnectedWF8266R = false;
    var connectionWF8266R;
    var socketCounter = 0;
    var package = { send: 0, recv: 0, millis: 0 };
    var timeManager = { lastTime: 0, startTime: 0, millis: 0 };
    var socketBuffer="";

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
        send("pinMode," + parseAPin(pin) + "=" + value);
    }
    ext.digitalWrite = function (pin, value) {
        send("digitalWrite," + parseAPin(pin) + "=" + value);
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
        var fre;
        if(frequency.indexOf(",")>0)
            fre = frequency.split(',')[1];
        else
            fre = frequency;

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
        if(isConnectedWF8266R)
        {
            if(type=="D")
                sendWF8266R("gpio," + pin + "=" + value);
            else
                sendWF8266R("gpio/pwm," + pin + "=" + value);
        }
        else
            send("wtgpio,type="+type+"&"+pin+"="+value);
    }
    ext.wfcsenservo = function(pin,degree){
        if(isConnectedWF8266R)
        {
            sendWF8266R("servo,pin=" + pin + "&degree=" + degree);
        }
        else
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

    ext.speech_text = function () {
        send('speech_text');
    }
    
    //WF8266R 
    ext.set_ip = function (_ip) {
        if (isConnectedWF8266R)
            return;
        ip = _ip;
        socketConnectionWF8266R(_ip);
    };
    
    ext.wf8266rState = function(){
        return isConnectedWF8266R;
    }
    
    ext.stopWF8266R = function(){
        if(connectionWF8266R != null)
            connectionWF8266R.close();
    }
    
    ext.readDistance = function(){
        return distance;
    }

    function parseAPin(pin)
    {
    if(pin[0] == "A")
    {
        return pin.substring(3,5);
    }
    else
        return pin;
    }

    function send(cmd) {
        if(isConnectedWF8266R)
        {
            cmd = "wfduino,"+cmd.replace(",",":").replace("=","~");
            sendWF8266R(cmd+"=");
        }
        else
            connection.send(cmd + "\r\n");
    }
    
    function sendWF8266R(cmd) {
        timeManager.millis = (new Date).getTime();

        //console.log(cmd + " " + socketCounter);
        package.send++;
        if (isConnectedWF8266R && socketCounter == 0) {
            if ((timeManager.millis - timeManager.lastTime) > 100) {
                timeManager.lastTime = (new Date).getTime();
                socketCounter++;
                connectionWF8266R.send(cmd);
            }
        }

    }
    
    function socketConnectionWF8266R(ip) {
        timeManager.startTime = (new Date).getTime();
        connectionWF8266R = new WebSocket('ws://' + ip + ':81/api', ['wf8266r']);
        connectionWF8266R.onopen = function (e) {
            isConnectedWF8266R = true;
        };
        connectionWF8266R.onclose = function (e) {
            isConnectedWF8266R = false;
        };
        connectionWF8266R.onmessage = function (e) {
            var jsonObj;
            if(e.data.length == 1)
            {
                socketBuffer+= e.data;
                console.log(e.data);
                if(e.data=='}')
                {
                    jsonObj = JSON.parse(socketBuffer);
                    socketBuffer = "";
                }
                else
                    return;
                    
            }
            else
            {
                socketCounter--;
                package.recv++;
                isConnectedWF8266R = true;
                jsonObj = JSON.parse(e.data.substring(0, e.data.length - 1));
            }

            //console.log(jsonObj);
            switch (jsonObj.Action) {
                case "digitalRead": eval('gpio.D' + jsonObj.Pin + '=' + jsonObj.Value); break;
                case "analogRead": eval('gpio.A' + jsonObj.Pin + '=' + jsonObj.Value); break;
                default: break;
            }

        };
        connectionWF8266R.onerror = function (e) {
            isConnectedWF8266R = false;
        };
    }

    function socketConnection(ip, port) {
        connection = new WebSocket('ws://' + ip + ':' + port);
        connection.onopen = function (e) {
            isConnected = true;
            send("heartMode,0=");
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
                case "voiceText": voiceData.Text = jsonObj.Text; break;
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
            [' ', '腳位 %d.gpioPin 模式設為 %m.mode', 'pinMode', 13, 'OUTPUT'],
            [' ', '腳位 %d.gpioPin 數位輸出 %m.level', 'digitalWrite', 13, 1],
            [' ', '腳位 %d.pwmGPIO 類比輸出 %n', 'analogWrite', 3, 255],
            ['r', '讀取數位腳位 %d.gpio ', 'digitalRead', 13],
            ['r', '讀取類比腳位 A%d.analogGPIO ', 'analogRead', '0'],
            [' ', '腳位 %d.pwmGPIO 播放音調，頻率為 %d.tone 時間為 %n ms', 'tone', 5, 'C2,523', 500],
            [' ', '關閉腳位 %d.pwmGPIO 的音調', 'noTone', 5],
            [' ', 'HCSR 超音波感測器，Echo 在腳位 %d.gpio Trig 在腳位 %d.gpio', 'distance', 5, 4],
            ['r', '讀取超音波感測器回傳距離', 'readDistance'],
            [' ', '伺服馬達為腳位 %d.pwmGPIO 轉動角度為 %n 度', 'servo', 5, 90],
            [' ', '%m.flushType 清空', 'flush', 'Voice'],
            ['w', '說 %s', 'speak_text', 'ScratchX 遇上 WFduino'], 
            [" ", "監聽語音", "speech_text"],
            ['r', '語音文字', 'voiceText'],
            
            [' ', 'WF8266R 位址 %s', 'set_ip', 'mywfXXXX.local'],
            [' ', '中斷 WF8266R 連線', 'stopWF8266R'],
            ['r', 'WF8266R 連線狀態', 'wf8266rState'],
            [' ', 'WF8266R 腳位 %d.wfgpio %m.wfgpioType 輸出 %n', 'wfgpio', 5, '數位', 1],
            [' ', 'WF8266R SERVO 伺服馬達腳位 %d.wfgpio 轉 %n 度', 'wfcsenservo', 5, 90],
            
            ['w', 'HTTP %m.restfulType 到 %s', 'http', 'POST', 'http://api.thingspeak.com/update?key=xxxxxx&field1=1&field2=2'],
            ['w', 'HTTP %m.restfulType 從 %s', 'http', 'GET', 'http://api.thingspeak.com/apps/thinghttp/send_request?api_key=EM18B52PSHXZB4DD'],
            [' ', 'LASS 設備編號 %s', 'lass', ''],
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
            'gpioPin': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0(14)', 'A1(15)', 'A2(16)', 'A3(17)', 'A4(18)', 'A5(19)', 'A6(20)', 'A7(21)'],
            'gpio': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
            'tone':['C1,262','C1#,277','D1,294','D1#,311','E1,330','F1,349','F1#,370','G1,392','G1#,415','A1,440','A1#,466','B1,494'
            ,'C2,523','C2#,554','D2,587','D2#,622','E2,659','F2,698','F2#,740','G2,784','G2#,831','A2,880','A2#,932','B2,988'
            ,'C3,1046','C3#,1109','D3,1175','D3#,1245','E3,1318','F3,1397','F3#,1480','G3,1568','G3#,1661','A3,1760','A3#,1865','B3,1976'],
            'wfgpio': ['5', '4', '12', '13', '14', '15', '16', '0', '1', '2', '3'],
            'wfgpioType':['數位','類比']
        },
        url: 'http://unumobile.github.io/wf8266r.js-scratchx-extensions'
    };

    // Register the extension
    ScratchExtensions.register('WF8266 Arduino', descriptor, ext);
})({});