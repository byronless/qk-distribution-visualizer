var Data = function () {

};

Data.prototype = {
    values: [],
    types: [],
    lastTime: 0,
    pointer: null,
    pos: 0,
    size: 0,

    add: function (o) {
        if (parseInt(o.Timestamp) > this.lastTime) {
            this.lastTime = parseInt(o.Timestamp);
            this.pointer = {};
            this.pointer[o.Action] = [];
            this.types.push(o.Action);
            this.values.push(this.pointer);
            this.size++;
            this.pos = this.size - 1;
        }

        if (!this.pointer.hasOwnProperty(o.Action)) {
            this.pointer[o.Action] = [];

            // check if we haven't such type in our list
            if (this.types.indexOf(o.Action) == -1) {
                this.types.push(o.Action);
            }
        }

        this.pointer[o.Action].push({
            quadkey: o.QKeyId,
            distribution: parseFloat(o.Probability),
        });
    },

    setPosition: function (pos) {
        this.pointer = this.values[pos];
        this.pos = pos;
    },

    currentTypes: function () {
        return Object.keys(this.pointer);
    },

    closest: function (pos, type) {
        // todo implement
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
        function (t) {
            var t = t.toString(16);
            return {f: '#00' + t + '00', b: '#00FF00'};
        },
        function (t) {
            var t = t.toString(16);
            return {f: '#' + t + '0000', b: '#FF0000'};
        },
        function (t) {
            var t = t.toString(16);
            return {f: '#' + t + '0000', b: '#FF0000'};
        },
        // function (t) {
        //     var t = parseInt(t / 2);
        //     t = t.toString(16);
        //     return {f: '#' + t.slice(0, 1) + '0' + t.slice(1) + '000', b: '#F0F000'};
        // }
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

    afterUpload: function () {
        this.data.setPosition(0);
        var number = $('.js-number');
        number.val(0);
        number.attr('min', 0);
        number.attr('max', this.data.size - 1);

        var range = $('.js-range');
        range.val(0);
        range.attr('min', 0);
        range.attr('max', this.data.size - 1);

        var selectValues = {};
        for (var i = 0; i < this.data.currentTypes().length; i++) {
            selectValues[i] = this.data.currentTypes()[i];
        }

        var s = $('.js-select');
        s.html("");
        s.append($("<option selected='true'></option>")
            .attr("value", "all")
            .text("all"));
        $.each(selectValues, function (key, value) {
            s.append($("<option></option>")
                .attr("value", value)
                .text(value));
        });

        this.drawQuadkeys();
    },

    change: function (val, s) {
        this.data.setPosition(val);
        var number = $('.js-number');
        number.val(val);
        // number.attr('disabled', 'disabled');

        var range = $('.js-range');
        range.val(val);
        // range.attr('disabled', 'disabled');

        // var loader = $('.loader-wrapper');
        // loader.css('display', 'block');

        var selectValues = {};
        for (var i = 0; i < this.data.currentTypes().length; i++) {
            selectValues[i] = this.data.currentTypes()[i];
        }
        if (s) {
            var s = $('.js-select');
            s.html("");
            s.append($("<option selected='true'></option>")
                .attr("value", "all")
                .text("all"));
            $.each(selectValues, function (key, value) {
                s.append($("<option></option>")
                    .attr("value", value)
                    .text(value));
            });
        }

        this.removeFromMap();
        this.drawQuadkeys();
    },

    drawQuadkeys: function () {
        var number = $('.js-number');
        var range = $('.js-range');
        var loader = $('.loader-wrapper');
        var s = $('.js-select');
        var that = this;

        for (var i = 0; i < this.data.currentTypes().length; i++) {
            var t = this.data.currentTypes()[i];
            if (s.val() != "all" && s.val() != t) {
                continue;
            }

            // todo move somewhere
            var distributions = [];
            for (var j = 0; j < this.data.pointer[t].length; j++) {
                distributions.push(this.data.pointer[t][j].distribution);
            }
            var min = Math.min.apply(null, distributions);
            var max = Math.max.apply(null, distributions);
            var delta = (max - min) / 200;

            for (var j = 0; j < this.data.pointer[t].length; j++) {
                (function() {
                    var value = that.data.pointer[t][j];
                    var rect = that.drawQuadkey(value.quadkey,
                        that.pickColor(parseFloat(value.distribution),
                            t,
                            delta,
                            min));

                    // todo fix
                    google.maps.event.addListener(rect, 'click', function (e) {
                        that.infoWindow.setContent(value.quadkey + ': ' + value.distribution);
                        that.infoWindow.setPosition(e.latLng);
                        that.infoWindow.open(that.map);
                    }.bind(that));


                    // google.maps.event.addListenerOnce(that.map, 'idle', function () {
                        // number.removeAttr('disabled');
                        // range.removeAttr('disabled');
                        // loader.css('display', 'none');
                    // });

                    var location = that.quadkeyCoord(value.quadkey);
                    var point = new google.maps.LatLng(location.lat, location.lng);
                    that.bbox.extend(point);
                })();
            }
        }

        var legend = $('.legend');
        legend.html("");
        for (var i in this.colors) {
            legend.append("<div>" + i + "<div class='palette' style='background-color: " + this.colors[i](0).b + "'></div></div>");
        }

        this.map.fitBounds(this.bbox);
    },

    fillData: function (results, parser) {
        for (var i = 0; i < results.data.length; i++) {
            var r = results.data[i];
            this.data.add(r);
        }
    },

    pickColor: function (distribution, type, delta, min) {
        if (!this.colors.hasOwnProperty(type)) {
            this.colors[type] = this.color_list[0];
            this.color_list.splice(0, 1);
        }

        var c = 255 - (distribution - min) / delta;
        var t = Math.round(c).toString(16);
        // var color_f = this.colors[type](t);
        var color_f = this.colors[type](Math.round(c));

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
        // this.input = document.getElementById("csv-text-box").value;

        // if (this.input == "") {
        Papa.parse(textFile, config);
        // } else {
        //     var lines = Papa.parse(this.input, config);
        //     // todo fix
        //     this.drawQuadkeys(lines);
        // }
    }

};

var d = new Drawer();

google.maps.event.addDomListener(window, 'load', d.initialize.bind(d));

function buttonClickHandler() {
    d.buttonClickHandler();
}

$('.js-range').change(function (e) {
    d.change(this.value, true);
});

$('.js-number').change(function (e) {
    d.change(this.value, true);
});

$('.js-select').change(function (e) {
    console.log(this.selectedIndex);
    d.change($('.js-number').val(), false);
});