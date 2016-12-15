var Data = function () {

};

Data.prototype = {
    values: [],
    time: [],
    types: [],
    lastTime: 0,

    add: function (o) {
        this.size++;

        this.values.push({
            quadkey: o.QKeyId,
            distribution: parseFloat(o.Weight),
            // distribution: parseFloat(o.VehicleProbability),
        });
    },
};

var Drawer = function () {

};

Drawer.prototype = {
    rects: [],
    map: null,
    data: new Data(),
    colors: {},
    color_list: [
        function (t) {
            var t = t.toString(16);
            return {f: '#0000' + t, b: '#0000FF'};
        },
    ],
    // input: document.getElementById("csv-text-box").value,
    fileInput: $('.js-upload-file')[0],
    bbox: new google.maps.LatLngBounds(),
    infoWindow: new google.maps.InfoWindow({maxWidth: 200, minWidth: 200}),

    initialize: function () {
        var mapOptions = {
            zoom: 3,
            center: new google.maps.LatLng(0, -180),
            mapTypeId: google.maps.MapTypeId.TERRAIN
        };

        this.map = new google.maps.Map(document.getElementById('map-canvas'),
            mapOptions);
    },

    removeFromMap: function () {
        this.rects.forEach(function (polyline) {
            polyline.setMap(null);
        });
        this.rects = [];
    },

    showTime: function () {
        var t = $('.js-time');
        t.html('');
        t.append(this.data.currentTime());
    },

    buildInfoTable: function () {

    },

    afterUpload: function () {
        this.drawQuadkeys();
    },

    filterQuadkey: function(qk) {
         this.drawQuadkey(qk, {
             border: '#FF0000',
             fill: '#FF0000',
             opacity: '1',
         });
    },

    drawQuadkeys: function () {
        console.log('draw');
        var loader = $('.loader-wrapper');
        var that = this;

        // todo move somewhere
        var distributions = [];
        for (var j = 0; j < this.data.values.length; j++) {
            distributions.push(this.data.values[j].distribution);
        }
        var min = Math.min.apply(null, distributions);
        var max = Math.max.apply(null, distributions);
        var delta = (max - min) / 200;

        for (var j = 0; j < this.data.values.length; j++) {
            (function() {
                var value = that.data.values[j];
                var rect = that.drawQuadkey(value.quadkey,
                    that.pickColor(parseFloat(value.distribution),
                        delta,
                        min));

                // todo fix
                google.maps.event.addListener(rect, 'click', function (e) {
                    that.infoWindow.setContent(value.quadkey + ': ' + value.distribution);
                    that.infoWindow.setPosition(e.latLng);
                    that.infoWindow.open(that.map);
                }.bind(that));

                var location = that.quadkeyCoord(value.quadkey);
                var point = new google.maps.LatLng(location.lat, location.lng);
                that.bbox.extend(point);
            })();
        }

        // var legend = $('.legend');
        // legend.html("");
        // for (var i in this.colors) {
        //     legend.append("<div>" + i + "<div class='palette' style='background-color: " + this.colors[i](0).b + "'></div></div>");
        // }

        this.map.fitBounds(this.bbox);
    },

    fillData: function (results, parser) {
        console.log('fillData');
        for (var i = 0; i < results.data.length; i++) {
            var r = results.data[i];
            this.data.add(r);
        }
    },

    pickColor: function (distribution, delta, min) {
        this.colors = this.color_list[0];

        var c = 255 - (distribution - min) / delta;
        var color_f = this.colors(Math.round(c));

        var od = 255 / 0.5;
        var o = 0.9 - c / od;

        return {fill: color_f.f, border: color_f.b, opacity: o};
    },

    quadkeyCoord: function (quadkey) {
        return tileToLocation(quadkeyToTile(quadkey), 17);
    },

    quadkeyBoundingBox: function (quadkey) {
        var tile = quadkeyToTile(quadkey);
        var topLeft = tileToLocation(tile, 17);
        var bottomRight = tileToLocation({x: tile.x + 1, y: tile.y + 1}, 17);
        return {
            north: topLeft.lat,
            south: bottomRight.lat,
            east: bottomRight.lng,
            west: topLeft.lng
        }
    },

    drawQuadkey: function (quadkey, color) {
        var rectangle = new google.maps.Rectangle({
            strokeColor: color.border,
            strokeOpacity: 0.2,
            strokeWeight: 0.5,
            fillColor: color.fill,
            fillOpacity: color.opacity,
            bounds: this.quadkeyBoundingBox(quadkey)
        });

        this.rects.push(rectangle);
        rectangle.setMap(this.map);

        return rectangle;
    },

    buttonClickHandler: function () {
        this.removeFromMap();

        this.bbox = new google.maps.LatLngBounds();

        this.data = new Data();

        var config = {
            delimiter: "",	// auto-detect
            newline: "",	// auto-detect
            header: true,
            dynamicTyping: false,
            preview: 0,
            encoding: "",
            worker: false,
            comments: true,
            step: this.fillData.bind(this),
            // complete: this.drawQuadkeys.bind(this),
            complete: this.afterUpload.bind(this),
            error: undefined,
            download: false,
            skipEmptyLines: true,
            chunk: undefined,
            fastMode: undefined,
        };

        var textFile = this.fileInput.files[0];
        Papa.parse(textFile, config);
    }

};

var d = new Drawer();

google.maps.event.addDomListener(window, 'load', d.initialize.bind(d));

function buttonClickHandler() {
    d.buttonClickHandler();
}

function quadkeyFilterHandler() {
    d.filterQuadkey($('.js-quadkey-filter').val());
}