"use strict";

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-riversurfing",
  "version": "0.0.2",
  "author": "Dustin Wiemar",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/duswie/windy-plugin-riversurfing"
  },
  "description": "Windy plugin for river windsurfers",
  "displayName": "Riverwindsurfing",
  "hook": "menu",
  "className": "plugin-rhpane plugin-mobile-rhpane",
  "exclusive": "rhpane",
  "dependencies": []
},
/* HTML */
'<div class="plugin-content"> Using excellent <b>Leaflet Omnivore</b> we can display whichever format we want. <ul data-ref="links"></ul> </div>',
/* CSS */
'',
/* Constructor */
function () {
  var bcast = W.require('broadcast');

  var store = W.require('store');

  var interpolator = W.require('interpolator');

  var _W$require = W.require('map'),
      map = _W$require.map;

  var _ = W.require('utils');

  var lines = [];
  var bearings = [];
  var url = "https://3dcl-previews.s3.eu-central-1.amazonaws.com/rhein.geojson";

  this.onopen = function () {
    store.set('overlay', 'wind');
    fetch(url).then(function (response) {
      return response.json();
    }).then(function (response) {
      response.features.forEach(function (f) {
        if (f.geometry.type != "LineString") return;
        if (f.geometry.coordinates.length < 2) return;

        for (var i = 1; i < f.geometry.coordinates.length; ++i) {
          var latlng = L.latLng(f.geometry.coordinates[i][1], f.geometry.coordinates[i][0]);
          var latlng_last = L.latLng(f.geometry.coordinates[i - 1][1], f.geometry.coordinates[i - 1][0]);
          lines.push(L.polyline([latlng_last, latlng]).addTo(map));
          var lat = latlng_last.lat;
          var lon = latlng_last.lng;
          var lat2 = latlng.lat;
          var lon2 = latlng.lng;
          var y = Math.sin(lon2 - lon) * Math.cos(lat2);
          var x = Math.cos(lat) * Math.sin(lat2) - Math.sin(lat) * Math.cos(lat2) * Math.cos(lon2 - lon);
          var θ = Math.atan2(y, x);
          bearings.push((θ * 180 / Math.PI + 360) % 360);
        }
      });
      interpolateValues();
    })["catch"](function (error) {
      console.log(error);
    });
    bcast.on('redrawFinished', interpolateValues);
  };

  var interpolateValues = function interpolateValues() {
    if (store.get('overlay') !== 'wind') {
      console.warn('I can iterpolate only Wind sorry');
      return;
    }

    interpolator(function (interpolate) {
      for (var i = 0; i < lines.length; i++) {
        var latlngs = lines[i].getLatLngs();
        var lat = latlngs[0].lat;
        var lon = latlngs[0].lng;
        var values = interpolate.call(interpolator, {
          lat: lat,
          lon: lon
        });

        if (Array.isArray(values)) {
          var _$wind2obj = _.wind2obj(values),
              wind = _$wind2obj.wind,
              dir = _$wind2obj.dir;

          var diff = Math.abs(bearings[i] - dir);

          if (diff < 15 && wind > 4) {
            lines[i].setStyle({
              color: "red"
            });
          } else if (diff < 30 && wind > 4) {
            lines[i].setStyle({
              color: "orange"
            });
          } else if (diff < 30) {
            lines[i].setStyle({
              color: "deepskyblue"
            });
          } else {
            lines[i].setStyle({
              color: "blue"
            });
          }
        } else {
          lines[i].setStyle({
            color: "gray"
          });
        }
      }
    });
  };

  this.onclose = function () {
    if (lines.length > 0) {
      lines.forEach(function (line) {
        return map.removeLayer(line);
      });
      bcast.off('redrawFinished', interpolateValues);
      lines = [];
      bearings = [];
    }
  };
});