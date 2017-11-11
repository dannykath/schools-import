var config = require('./config')
var login = require('./login')
var user = null;
login(function(u) {
    user = u;
});
module.exports = function() {

    var gridData = null;
    firebase.initializeApp(config.fconfig);
    mapboxgl.accessToken = config.accessToken;
    var map = new mapboxgl.Map({
        container: 'map',
        style: config.style,
        zoom: 12,
        center: [-71.97722138410576, -13.517379300798098]
    });

    map.on('click', config.layerId, function(e) {
        var html = "<div class='pill'> <a id='progress' href='#' class='col12 button'>Start Mapping in JOSM</a>";
        if (e.features[0].properties.status === 'progress') {
            html = "<a id='done' href='#' class='col12 button'>Mark task as done</a>";
        }
        if (e.features[0].properties.status === 'done') {
            html = "<a id='validate' href='#' class='col12 button'>Validate</a>";
        }
        if (e.features[0].properties.status === 'validate') {
            html = "<a id='empty' href='#' class='col12 button'>Invalidate</a>";
        }
        html = html + '</div>';
        if (!user) {
            html = '<h5>You need to authenticate!!</h5>'
        }
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map)
        $('#progress').on('click', function(event) {
            downloadJOSM(e.features[0])
            save('progress', e.features[0])
        });
        $('#done').on('click', function(event) {
            save('done', e.features[0])
        });
        $('#validate').on('click', function(event) {
            save('validate', e.features[0])
        });
        $('#empty').on('click', function(event) {
            save('empty', e.features[0])
        });
    })

    function downloadJOSM(id) {
        $.getJSON('http://localhost:8111/import?new_layer=true&url=https://s3.amazonaws.com/tofix/aa.osm');
    }

    function save(type, obj) {
        firebase.database().ref(config.layerId + '/' + obj.properties.idgrid).set({
            status: type,
            user: user.display_name
        });
    }

    $(document).ready(function() {
        getFeatures();
    });

    function getFeatures() {
        firebase.database().ref(config.layerId).on("value", function(snapshot) {
            loadGist(snapshot.val() || {})
        }, function(errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    }

    function loadGist(done) {
        if (gridData) {
            print(done, gridData)
        } else {
            $.getJSON(config.gist, function(data) {
                gridData = data
                print(done, gridData)
            });
        }
    }

    function print(done, data) {
        var centroids = turf.featureCollection([])
        for (var i = 0; i < data.features.length; i++) {
            data.features[i].properties.status = 'empty'
            if (done[data.features[i].properties.idgrid]) {
                data.features[i].properties = Object.assign(data.features[i].properties, done[data.features[i].properties.idgrid])
                var cen = turf.centroid(data.features[i]);
                cen.properties.user = data.features[i].properties.user
                centroids.features.push(cen)
            }
        }
        if (map.getSource(config.layerId)) {
            map.getSource(config.layerId).setData(data);
            map.getSource('line').setData(data);
            map.getSource('label').setData(centroids);
        } else {
            map.addLayer({
                id: config.layerId,
                type: 'fill',
                source: {
                    type: 'geojson',
                    data: data
                },
                paint: {
                    'fill-color': {
                        property: 'status',
                        type: 'categorical',
                        stops: [
                            ['empty', '#51503f'],
                            ['progress', '#eaa8a8'],
                            ['done', '#ffd400'],
                            ['validate', '#2de561']
                        ]
                    },
                    'fill-opacity': 0.3
                }
            });
            map.addLayer({
                id: 'line',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: data
                },
                paint: {
                    'line-width': 1,
                    'line-color': {
                        type: 'categorical',
                        property: 'status',
                        stops: [
                            ['empty', '#51503f'],
                            ['progress', '#eaa8a8'],
                            ['done', '#ffd400'],
                            ['validate', '#2de561']
                        ]
                    }
                }
            });
            map.addLayer({
                id: 'label',
                type: 'symbol',
                source: {
                    type: 'geojson',
                    data: centroids
                },
                layout: {
                    'text-field': 'By: {user}',
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 10
                },
                paint: {
                    'text-color': '#6b6b6b',
                    'text-halo-color': '#fff',
                    'text-halo-width': 1
                },
            });
        }
    }
}