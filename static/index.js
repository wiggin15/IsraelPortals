var map;
var sidebar_divs = [];
var gym_markers = [];
var gym_names = [];
var pokestops = [];
var infowindow = null;

function addMarker(infowindow, obj, icon) {
    marker = new google.maps.Marker({
        position: {lat: obj.lat, lng: obj.lng},
        map: map,
        icon: icon
    });
    var content = "<span>";
    if (obj.img !== null)
        content += "<a class=\"obj-img\" href=\"" + obj.img + "\" target=\"_blank\"><img src=\"" + obj.img + "\"></a> ";
    content += "<div><b>" + obj.name + "</b> ";
    content += "<a onclick=\"popup_link(event);\"><i class=\"glyphicon glyphicon-share-alt\"></i></a>";
    content += "<br><input type=\"textbox\" class=\"guid\" style=\"width: 250px\" value=\"" + obj.guid + "\" readonly=\"readonly\" onclick=\"select_guid(event)\"> <i class=\"glyphicon glyphicon-copy\" onclick=\"copy_guid(event)\"></i>";
    content += "<br><a href=\"http://maps.google.com/maps?q=" + obj.lat + "," + obj.lng + "\" target=\"_blank\">" + obj.lat + ", " + obj.lng + "</a>";
    content += "</div></span>";

    var callback = (function(marker, content, infowindow) {
          return function() {
              infowindow.setContent(content);
              infowindow.open(map, marker);
              //if (map.getZoom() < 11) map.setZoom(15);
          };
    })(marker, content, infowindow);

    google.maps.event.addListener(marker, 'click', callback);

    return {guid: obj.guid, name: obj.name, callback: callback, marker: marker}
}

function initMap() {
    let isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;

    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 32.1166801, lng: 34.8110482},
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        clickableIcons: false,
        fullscreenControl: false,
        gestureHandling: 'greedy'
    });
    infowindow = new google.maps.InfoWindow();
    var geoloccontrol = new klokantech.GeolocationControl(map, 15);

    /* Search boxes */
    var pac_input = document.getElementById('pac-input');
    var gym_input = document.getElementById('gym-input');
    var search_boxes = document.getElementById('search-boxes');
    var searchBox = new google.maps.places.SearchBox(pac_input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(search_boxes);

    map.addListener('bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();
        if (places.length == 0) {
            return;
        }
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {
            if (!place.geometry) {
                return;
            }

            if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });

    $.getJSON("gyms.json", function(data) {  });
    var urlParams = new URLSearchParams(window.location.search);
    var lastUpdate = "";
    setTimeout(() => {
    $.getJSON("gyms.json", function(data) {
        gyms = data;
        $.each(gyms, function(i, gym) {
            gym = {
                guid: gym[0],
                name: gym[1],
                lat: gym[2],
                lng: gym[3],
                img: gym[4],
                first_seen: gym[5],
            }
            if (gym.first_seen > lastUpdate) lastUpdate = gym.first_seen;
            marker_struct = addMarker(infowindow, gym, "static/gym.png")
            S2PokeGrid.register(gym.lat, gym.lng, true);

            var sidebar_div = $("<div/>").addClass("sidebar-gym");
            $("<b/>").text(gym.name).on('click', marker_struct.callback).appendTo(sidebar_div);
            sidebar_divs.push([name, sidebar_div]);

            gym_markers.push(marker_struct);
            gym_names.push($.trim(gym.name));
            if (gym.guid == document.location.hash.substring(1)) {
                marker_struct.callback();
            }

        });
        var gym_count = gyms.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        $("<div/>")
            .addClass("sidebar-gym")
            .text("Loaded " + gym_count + " gyms" )
            .appendTo($("#sidebar-inner"));
        $("<div/>")
            .addClass("sidebar-gym")
            .text("Last Scanned: " + lastUpdate)
            .appendTo($("#sidebar-inner"));
        $("<div/>").addClass("sidebar-gym").text("Gym list:").appendTo($("#sidebar-inner"))
            .css("font-weight", "bold").css("font-size", "20px");
        sidebar_divs.sort(function(a, b){return a[0].localeCompare(b[0]);});
        $.each(sidebar_divs, function(i, sidebar_div) {
            sidebar_div[1].appendTo($("#sidebar-inner"));
        });

        var goto_gym = function() {
            var results = [];
            gym_markers.forEach(function(gym_marker) {
                if ($.trim(gym_marker['name'].toLowerCase()) == $.trim($(gym_input).val().toLowerCase())) {
                    results.push(gym_marker);
                }
            });
            if (results.length == 0) return;
            else if (results.length == 1)
                results[0]['callback']();
            else {
                var dialog_div = $("<div/>");
                results.forEach(function(gym_marker) {
                    var link = $("<div/>").addClass('gym-option');
                    link.text(gym_marker['name']);
                    $("<span/>").text(gym_marker['guid']).addClass('gym-option-guid').appendTo(link);
                    link.on('click', function() {
                        gym_marker['callback']();
                        dialog_div.dialog("close");
                    });
                    link.appendTo(dialog_div);
                });
                dialog_div.dialog({
                    width: 400,
                    maxHeight: 400,
                    minHeight: 0
                });
            }
        }
        $(gym_input).on('keypress', function(e) {
            if(e.which == 13) {
                goto_gym();
            }
        });
        gym_names.sort();
        gym_names = Array.from(new Set(gym_names));
        $(gym_input).autocomplete({
            source: function(request, response) {
                var patt = new RegExp("^" + request.term, "i");
                var filteredArray = jQuery.grep(gym_names, function(item) {
                    return item.match(patt);
                });
                response(filteredArray);
            }
        });
        $(search_boxes).show();
        $("#loader").hide();
    });

    S2Grid.setupGrid(map);
    $("#s2grid").change(function() {
        if ($(this).is(':checked')) {
            S2Grid.showGrid();
        } else {
            S2Grid.hideGrid();
        }
    });

    $("#stops").change(function() {
        if ($(this).is(':checked')) {
            if (pokestops.length == 0) loadPokestops();
                pokestops.forEach(function(marker) {
                    marker['marker'].setMap(map);
                });
        } else {
                pokestops.forEach(function(marker) {
                    marker['marker'].setMap(null);
                });
        }
    });

}, 1000);
}

function loadPokestops() {
    $("#loader").show()
    $.getJSON("stops.json", function(data) {
        stops = data;
        $.each(stops, function(i, stop) {
            stop = {
                guid: stop[0],
                name: stop[1],
                lat: stop[2],
                lng: stop[3],
                img: stop[4],
            }
            marker_struct = addMarker(infowindow, stop, "static/neutral.png")
            pokestops.push(marker_struct);
            S2PokeGrid.register(stop.lat, stop.lng, false);
        });
        $("#loader").hide();
    });
}

function openNav() {
    document.getElementById("sidebar-outer").style.visibility = "visible";
    document.getElementById("sidebar-outer").style.width = "25%";
    document.getElementById("sidebar-outer").style.transition = "width 0.5s, visibility 0s";
    document.getElementById("map").style.left = "25%";
    document.getElementById("map").style.width = "75%";
}

function closeNav() {
    document.getElementById("sidebar-outer").style.width = "0";
    document.getElementById("map").style.left = "0";
    document.getElementById("map").style.width = "100%";
    document.getElementById("sidebar-outer").style.visibility = "hidden";
    document.getElementById("sidebar-outer").style.transition = "width 0.5s, visibility 0.5s";
}

function select_guid(event) {
    $(event.target).focus().select();
}

function copy_guid(event) {
    event.stopPropagation();
    $(event.target).parent().find('.guid').select();
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    return false;
}

function popup_link(event) {
    var href = window.location.origin + "#" + $(event.target).parent().parent().find(".guid").val();
    var dialog_div = $("<div/>");
    $("<div/>").text("Link to this gym:").appendTo(dialog_div);
    $("<input/>")
        .css("width", "100%")
        .attr("disabled", "disabled")
        .attr("type", "textbox")
        .val(href)
        .appendTo($("<a/>").attr("href", href).appendTo(dialog_div));
    dialog_div.dialog({
        width: 500,
        height: 150,
        buttons: [
            {
                text: "Close",
                click: function() {
                    $( this ).dialog( "close" );
                }
            }
        ]});
}
