            var map;
            function initMap() {
                map = new google.maps.Map(document.getElementById('map'), {
                    center: {lat: 32.1166801, lng: 34.8110482},
                    zoom: 15,
                    mapTypeControl: false,
                    streetViewControl: false,
                    clickableIcons: false,
                    gestureHandling: 'greedy'
                });
                var infowindow = new google.maps.InfoWindow();
                var geoloccontrol = new klokantech.GeolocationControl(map, 15);

                /* Search boxes */
                var pac_input = document.getElementById('pac-input');
                var portal_input = document.getElementById('portal-input');
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

                $.getJSON("gyms.json", function(data) { gyms = data; });
                var sidebar_divs = [];
                var portal_markers = [];
                var portal_names = [];
                var urlParams = new URLSearchParams(window.location.search);
                $.getJSON("portals.json", function(data) {
                    $.each(data, function(i, portal) {
                        guid = portal[0];
                        lat = portal[1] / 1000000.0;
                        lng = portal[2] / 1000000.0;
                        img = portal[3];
                        name = portal[4];
                        first_seen = portal[5];
                        if (urlParams.has("show_only") && first_seen != urlParams.get("show_only"))
                            return;
                        is_gym = $.inArray(guid, gyms) != -1;
                        S2PokeGrid.register(lat, lng, is_gym);
                        marker = new google.maps.Marker({
                            position: {lat: lat, lng: lng},
                            map: map,
                            icon: is_gym ? "static/gym3.png" : "static/neutral2.png"
                        });
                        var content = "<span>"
                        content += "<b>" + name + "</b> "
                        if (img !== null)
                            content += "<a href=\"" + img + "\" target=\"_blank\"><img src=\"static/pic.svg\" width=12 height=12></a>"
                        content += "<br>" + guid
                        content += "<br><a href=\"geo:" + lat + "," + lng + "\">" + lat + ", " + lng + "</a>";
                        content += "</span>";

                        var callback = (function(marker, content, infowindow) {
                              return function() {
                                  infowindow.setContent(content);
                                  infowindow.open(map, marker);
                                  //if (map.getZoom() < 11) map.setZoom(15);
                              };
                        })(marker, content, infowindow);

                        google.maps.event.addListener(marker, 'click', callback);

                        if (is_gym) {
                            var sidebar_div = $("<div/>").addClass("sidebar-portal");
                            $("<b/>").text(name).on('click', callback).appendTo(sidebar_div);
                            sidebar_divs.push([name, sidebar_div])
                        }
                        portal_markers.push([guid, name, callback]);
                        portal_names.push($.trim(name));
                        if (guid == document.location.hash.substring(1)) {
                            callback();
                        }

                    });
                    var portal_count = portal_names.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    $("<div/>")
                        .addClass("sidebar-portal")
                        .text("Loaded " + portal_count + " portals, " + gyms.length + " gyms.")
                        .appendTo($("#sidebar-inner"));
                    $("<div/>").addClass("sidebar-portal").text("Gym list:").appendTo($("#sidebar-inner"))
                        .css("font-weight", "bold").css("font-size", "20px");
                    sidebar_divs.sort(function(a, b){return a[0].localeCompare(b[0]);});
                    $.each(sidebar_divs, function(i, sidebar_div) {
                        sidebar_div[1].appendTo($("#sidebar-inner"));
                    });

                    var goto_portal = function() {
                        var results = []
                        portal_markers.forEach(function(portal_marker) {
                            if ($.trim(portal_marker[1].toLowerCase()) == $.trim($(portal_input).val().toLowerCase())) {
                                results.push(portal_marker);
                            }
                        });
                        if (results.length == 0) return;
                        else if (results.length == 1)
                            results[0][2]();
                        else {
                            var dialog_div = $("<div/>");
                            results.forEach(function(portal_marker) {
                                var link = $("<div/>").addClass('portal-option');
                                link.text(portal_marker[1]);
                                $("<span/>").text(portal_marker[0]).addClass('portal-option-guid').appendTo(link);
                                link.on('click', function() {
                                    portal_marker[2]();
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
                    $(portal_input).on('keypress', function(e) {
                        if(e.which == 13) {
                            goto_portal();
                        }
                    });
                    portal_names.sort();
                    portal_names = Array.from(new Set(portal_names));
                    $(portal_input).autocomplete({
                        source: function(request, response) {
                            var patt = new RegExp("^" + request.term, "i");
                            var filteredArray = jQuery.grep(portal_names, function(item) {
                                return item.match(patt);
                            });
                            response(filteredArray);
                        }
                    });
                    $(search_boxes).show();
                    $("#loader, #loader-bg").hide();
                });
                S2Grid.setupGrid(map);
                $("#s2grid").change(function() {
                    if ($(this).is(':checked')) {
                        S2Grid.showGrid();
                    } else {
                        S2Grid.hideGrid();
                    }
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
