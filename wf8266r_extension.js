(function(ext) {
    ext.ip = "";
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    ext.set_ip = function(_ip, callback) {
        console.log(_ip);
        ext.ip = _ip;
        // Make an AJAX call to the Open Weather Maps API
        $.ajax({
              url: 'http://api.openweathermap.org/data/2.5/weather?q=&units=imperial',
              dataType: 'jsonp',
              success: function( weather_data ) {
                  // Got the data - parse it and return the temperature
                  temperature = weather_data['main']['temp'];
                  callback(temperature);
              }
        });
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            ['R', 'WF8266R IP %s', 'set_ip', 'mywf9441.local'],
        ]
    };

    // Register the extension
    ScratchExtensions.register('WF8266R.js', descriptor, ext);
})({});