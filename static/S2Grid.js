const S2Grid = {};

S2Grid.polys = [];
S2Grid.enabled = false;
S2Grid.seenCells = {};

const gymCellLevel = 14; // the cell level which is considered when counting POIs to determine # of gyms
const poiCellLevel = 17; // the cell level where there can only be 1 POI translated to pogo

S2Grid.isCellOnScreen = function(mapBounds, cell) {
    const corners = cell.getCornerLatLngs();
    const cellBounds = new google.maps.LatLngBounds(corners[0], corners[1]).extend(corners[2]).extend(corners[3]);
    return cellBounds.intersects(mapBounds);
}

S2Grid.getLatLngPoint = function(data) {
    const result = {
        lat: typeof data.lat == 'function' ? data.lat() : data.lat,
        lng: typeof data.lng == 'function' ? data.lng() : data.lng
    };

    return result;
}

S2Grid.clearCellGrid = function() {
    for (index = 0; index < S2Grid.polys.length; index++) {
        S2Grid.polys[index].setMap(null);
    }
    S2Grid.polys = [];
}

S2Grid.drawCellGrid = function(gridLevel, color, width, opacity) {
    const bounds = map.getBounds();
    S2Grid.seenCells = {};
    const drawCellAndNeighbors = function (cell, color, width, opacity) {
        const cellStr = cell.toString();

        if (!S2Grid.seenCells[cellStr]) {
            // cell not visited - flag it as visited now
            S2Grid.seenCells[cellStr] = true;

            if (S2Grid.isCellOnScreen(bounds, cell)) {
                // on screen - draw it
                S2Grid.polys.push(S2Grid.drawCell(cell, color, width, opacity));

                // and recurse to our neighbors
                const neighbors = cell.getNeighbors();
                for (let i = 0; i < neighbors.length; i++) {
                    drawCellAndNeighbors(neighbors[i], color, width, opacity);
                }
            }
        }
    };

    const cell = S2.S2Cell.FromLatLng(S2Grid.getLatLngPoint(map.getCenter()), gridLevel);
    drawCellAndNeighbors(cell, color, width, opacity);
}

S2Grid.drawCell = function(cell, color, weight, opacity) {
    const corners = cell.getCornerLatLngs();

    const fillOpacity = S2PokeGrid.isCellMissingGyms(cell) ? 0.2 : 0;

    var poly = new google.maps.Polygon({
        path: [corners[0], corners[1], corners[2], corners[3], corners[0]],
        geodesic: true,
        strokeColor: color,
        strokeOpacity: opacity,
        strokeWeight: weight,
        clickable: false,
        fillColor: '#FF0000',
        fillOpacity: fillOpacity,
        map: map
    });

    return poly;
}

S2Grid.drawCellGridByZoom = function(zoom) {
    if (zoom > 12) {
        S2Grid.drawCellGrid(gymCellLevel, '#004D40', 5, 0.5);
        if (zoom > 15) {
            S2Grid.drawCellGrid(poiCellLevel, '#388E3C', 2, 0.5);
        }
    } else {
        const gridLevel = Math.ceil(zoom);
        S2Grid.drawCellGrid(gridLevel, 'gray', 1, 0.5);
    }
}

S2Grid.updateMapGrid = function() {
    if (!S2Grid.enabled) return;

    const zoom = map.getZoom();

    S2Grid.clearCellGrid();
    S2Grid.drawCellGridByZoom(zoom);
}

S2Grid.setupGrid = function(map) {
    map.addListener('center_changed', S2Grid.updateMapGrid);
    map.addListener('zoom_changed', S2Grid.updateMapGrid);
    map.addListener('bounds_changed', S2Grid.updateMapGrid);
};

S2Grid.showGrid = function() {
    S2Grid.enabled = true;
    S2Grid.updateMapGrid();
}

S2Grid.hideGrid = function() {
    S2Grid.clearCellGrid();
    S2Grid.enabled = false;
}
