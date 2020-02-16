const S2Grid = {};

S2Grid.polys = [];
S2Grid.enabled = true;

const gymCellLevel = 14; // the cell level which is considered when counting POIs to determine # of gyms
const poiCellLevel = 17; // the cell level where there can only be 1 POI translated to pogo

S2Grid.settings = {
      grids: [
        {
            level: gymCellLevel,
            width: 5,
            color: '#004D40',
            opacity: 0.5
        },
        {
            level: poiCellLevel,
            width: 2,
            color: '#388E3C',
            opacity: 0.5
        }
    ],
};

S2Grid.isCellOnScreen = function(mapBounds, cell) {
    const corners = cell.getCornerLatLngs();
    const cellBounds = new google.maps.LatLngBounds(corners[0], corners[1]).extend(corners[2]).extend(corners[3]);
    return cellBounds.intersects(mapBounds);
}

/**
 * Refresh the S2 grid over the map
 */
S2Grid.updateMapGrid = function() {
    if (!S2Grid.enabled) return;

    const zoom = map.getZoom();

    // draw the cell grid
    if (zoom > 4) {
        S2Grid.drawCellGrid(zoom);
    } else {
        S2Grid.clearCellGrid();
    }
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

S2Grid.drawCellGrid = function(zoom) {
    S2Grid.clearCellGrid();

    const bounds = map.getBounds();
    const seenCells = {};
    const drawCellAndNeighbors = function (cell, color, width, opacity) {
        const cellStr = cell.toString();

        if (!seenCells[cellStr]) {
            // cell not visited - flag it as visited now
            seenCells[cellStr] = true;

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

    for (let i = S2Grid.settings.grids.length - 1; i >= 0; --i) {
        const grid = S2Grid.settings.grids[i];
        const gridLevel = grid.level;
        if (gridLevel >= 6 && gridLevel < (zoom + 2)) {
            const cell = S2.S2Cell.FromLatLng(S2Grid.getLatLngPoint(map.getCenter()), gridLevel);
            drawCellAndNeighbors(cell, grid.color, grid.width, grid.opacity);
        }
    }
}

S2Grid.drawCell = function(cell, color, weight, opacity) {
    // corner points
    const corners = cell.getCornerLatLngs();

    // the level 6 cells have noticible errors with non-geodesic lines - and the larger level 4 cells are worse
    // NOTE: we only draw two of the edges. as we draw all cells on screen, the other two edges will either be drawn
    // from the other cell, or be off screen so we don't care
    var poly = new google.maps.Polyline({
        path: [corners[0], corners[1], corners[2], corners[3], corners[0]],
        geodesic: false,
        strokeColor: color,
        strokeOpacity: opacity,
        strokeWeight: weight,
        clickable: false
    });

    poly.setMap(map);

    return poly;
}

S2Grid.setupGrid = function(map) {
    map.addListener('center_changed', S2Grid.updateMapGrid);
    map.addListener('zoom_changed', S2Grid.updateMapGrid);
    map.addListener('bounds_changed', S2Grid.updateMapGrid);
    S2Grid.enabled = false;
};

S2Grid.showGrid = function() {
    S2Grid.enabled = true;
    S2Grid.updateMapGrid();
}

S2Grid.hideGrid = function() {
    S2Grid.clearCellGrid();
    S2Grid.enabled = false;
}
