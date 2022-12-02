const S2PokeGrid = {};

// cellPortals: dict - keys are the string representation of a cell, value is either:
// * for POI-level cell, a boolean indicating whehter there is a POI in the cell
// * for gym-level cell, a dict of number of stops expected in the cell and number of gyms registered in the cell
S2PokeGrid.cellPortals = {};

S2PokeGrid.register = function(lat, lng, isGym) {
    let cellPoi = S2.S2Cell.FromLatLng({lat: lat, lng: lng}, poiCellLevel);
    let cellPoiStr = cellPoi.toString();
    let poiInCellExists = false;
    if (cellPoiStr in S2PokeGrid.cellPortals) {
        poiInCellExists = true; // we already have a POI in this cell - it is not a stop
    }
    // mark POI in cell
    S2PokeGrid.cellPortals[cellPoiStr] = true;
    // Add to the gym level cell counter
    let cellGym = S2.S2Cell.FromLatLng({lat: lat, lng: lng}, gymCellLevel);
    let cellGymStr = cellGym.toString()
    if (!(cellGymStr in S2PokeGrid.cellPortals))
        S2PokeGrid.cellPortals[cellGymStr] = {'stops': 0, 'gyms': 0};
    if (!poiInCellExists) S2PokeGrid.cellPortals[cellGymStr]['stops'] += 1;
    if (isGym) S2PokeGrid.cellPortals[cellGymStr]['gyms'] += 1;
}

S2PokeGrid.isCellMissingGyms = function(cell) {
    if (cell.level == gymCellLevel) {
        cellCenter = cell.getLatLng()
        cellPortals = S2PokeGrid.cellPortals[cell.toString()];
        if (cellPortals !== undefined) {
            if (S2PokeGrid.gymsByPoi(cellPortals['stops']) > cellPortals['gyms']) {
                return true;
            }
        }
    }
    return false;
}

S2PokeGrid.gymsByPoi = function(numPoi) {
    if (numPoi >= 20) return 3;
    if (numPoi >= 6) return 2;
    if (numPoi >= 2) return 1;
    return 0;
}

S2PokeGrid.calculateAnomalies = function() {
    let tooMany = 0;
    let tooLittle = 0;
    Object.keys(S2PokeGrid.cellPortals).forEach(function(v) {
        if (!v.endsWith(gymCellLevel)) return;
        numPoi = S2PokeGrid.cellPortals[v]['stops'];
        expectedGyms = S2PokeGrid.gymsByPoi(numPoi);
        existingGyms = S2PokeGrid.cellPortals[v]['gyms'];
        if (expectedGyms > existingGyms) {
            tooLittle += expectedGyms - existingGyms;
        } else if (expectedGyms < existingGyms) {
            tooMany += existingGyms - expectedGyms;
        }
    });
    return {tooMany: tooMany, tooLittle: tooLittle};
}

S2PokeGrid.gymsOnScreen = function() {
    let estimated = 0;
    let registered = 0;
    Object.keys(S2Grid.seenCells).forEach(function(v) {
        if (!v.endsWith(gymCellLevel)) return;
        cellPortals = S2PokeGrid.cellPortals[v];
        if (cellPortals === undefined) return;
        numPoi = S2PokeGrid.cellPortals[v]['stops'];
        estimated += S2PokeGrid.gymsByPoi(numPoi);
        registered += S2PokeGrid.cellPortals[v]['gyms'];
    });
    console.log("Missing %d gyms (estimated %d, registered %d)", estimated - registered, estimated, registered);
}
