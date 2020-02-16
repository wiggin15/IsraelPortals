const S2 = {};

function LatLngToXYZ(latLng) {
    const d2r = Math.PI / 180.0;
    const phi = latLng.lat * d2r;
    const theta = latLng.lng * d2r;
    const cosphi = Math.cos(phi);

    return [Math.cos(theta) * cosphi, Math.sin(theta) * cosphi, Math.sin(phi)];
}

function XYZToLatLng(xyz) {
    const r2d = 180.0 / Math.PI;
    const lat = Math.atan2(xyz[2], Math.sqrt(xyz[0] * xyz[0] + xyz[1] * xyz[1]));
    const lng = Math.atan2(xyz[1], xyz[0]);

    return {lat: lat * r2d, lng: lng * r2d};
}

function largestAbsComponent(xyz) {
    const temp = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])];

    if (temp[0] > temp[1]) {
        if (temp[0] > temp[2]) {
            return 0;
        }
        return 2;
    }

    if (temp[1] > temp[2]) {
        return 1;
    }

    return 2;
}

function faceXYZToUV(face,xyz) {
    let u, v;

    switch (face) {
        case 0: u = xyz[1] / xyz[0]; v =    xyz[2] / xyz[0]; break;
        case 1: u = -xyz[0] / xyz[1]; v =   xyz[2] / xyz[1]; break;
        case 2: u = -xyz[0] / xyz[2]; v = -xyz[1] / xyz[2]; break;
        case 3: u = xyz[2] / xyz[0]; v =    xyz[1] / xyz[0]; break;
        case 4: u = xyz[2] / xyz[1]; v = -xyz[0] / xyz[1]; break;
        case 5: u = -xyz[1] / xyz[2]; v = -xyz[0] / xyz[2]; break;
        default: throw {error: 'Invalid face'};
    }

    return [u,v];
}

function XYZToFaceUV(xyz) {
    let face = largestAbsComponent(xyz);

    if (xyz[face] < 0) {
        face += 3;
    }

    const uv = faceXYZToUV(face, xyz);

    return [face, uv];
}

function FaceUVToXYZ(face, uv) {
    const u = uv[0];
    const v = uv[1];

    switch (face) {
        case 0: return [1, u, v];
        case 1: return [-u, 1, v];
        case 2: return [-u,-v, 1];
        case 3: return [-1,-v,-u];
        case 4: return [v,-1,-u];
        case 5: return [v, u,-1];
        default: throw {error: 'Invalid face'};
    }
}

function STToUV(st) {
    const singleSTtoUV = function (st) {
        if (st >= 0.5) {
            return (1 / 3.0) * (4 * st * st - 1);
        }
        return (1 / 3.0) * (1 - (4 * (1 - st) * (1 - st)));

    };

    return [singleSTtoUV(st[0]), singleSTtoUV(st[1])];
}

function UVToST(uv) {
    const singleUVtoST = function (uv) {
        if (uv >= 0) {
            return 0.5 * Math.sqrt (1 + 3 * uv);
        }
        return 1 - 0.5 * Math.sqrt (1 - 3 * uv);

    };

    return [singleUVtoST(uv[0]), singleUVtoST(uv[1])];
}

function STToIJ(st,order) {
    const maxSize = 1 << order;

    const singleSTtoIJ = function (st) {
        const ij = Math.floor(st * maxSize);
        return Math.max(0, Math.min(maxSize - 1, ij));
    };

    return [singleSTtoIJ(st[0]), singleSTtoIJ(st[1])];
}

function IJToST(ij,order,offsets) {
    const maxSize = 1 << order;

    return [
        (ij[0] + offsets[0]) / maxSize,
        (ij[1] + offsets[1]) / maxSize
    ];
}

// S2Cell class
S2.S2Cell = function () {};

//static method to construct
S2.S2Cell.FromLatLng = function (latLng, level) {
    const xyz = LatLngToXYZ(latLng);
    const faceuv = XYZToFaceUV(xyz);
    const st = UVToST(faceuv[1]);
    const ij = STToIJ(st,level);

    return S2.S2Cell.FromFaceIJ(faceuv[0], ij, level);
};

S2.S2Cell.FromFaceIJ = function (face, ij, level) {
    const cell = new S2.S2Cell();
    cell.face = face;
    cell.ij = ij;
    cell.level = level;

    return cell;
};

S2.S2Cell.prototype.toString = function () {
    return 'F' + this.face + 'ij[' + this.ij[0] + ',' + this.ij[1] + ']@' + this.level;
};

S2.S2Cell.prototype.getLatLng = function () {
    const st = IJToST(this.ij, this.level, [0.5, 0.5]);
    const uv = STToUV(st);
    const xyz = FaceUVToXYZ(this.face, uv);

    return XYZToLatLng(xyz);
};

S2.S2Cell.prototype.getCornerLatLngs = function () {
    const offsets = [
        [0.0, 0.0],
        [0.0, 1.0],
        [1.0, 1.0],
        [1.0, 0.0]
    ];

    return offsets.map(offset => {
        const st = IJToST(this.ij, this.level, offset);
        const uv = STToUV(st);
        const xyz = FaceUVToXYZ(this.face, uv);

        return XYZToLatLng(xyz);
    });
};

S2.S2Cell.prototype.getNeighbors = function (deltas) {

    const fromFaceIJWrap = function (face,ij,level) {
        const maxSize = 1 << level;
        if (ij[0] >= 0 && ij[1] >= 0 && ij[0] < maxSize && ij[1] < maxSize) {
            // no wrapping out of bounds
            return S2.S2Cell.FromFaceIJ(face,ij,level);
        }

        // the new i,j are out of range.
        // with the assumption that they're only a little past the borders we can just take the points as
        // just beyond the cube face, project to XYZ, then re-create FaceUV from the XYZ vector
        let st = IJToST(ij,level,[0.5, 0.5]);
        let uv = STToUV(st);
        let xyz = FaceUVToXYZ(face, uv);
        const faceuv = XYZToFaceUV(xyz);
        face = faceuv[0];
        uv = faceuv[1];
        st = UVToST(uv);
        ij = STToIJ(st,level);
        return S2.S2Cell.FromFaceIJ(face, ij, level);
    };

    const face = this.face;
    const i = this.ij[0];
    const j = this.ij[1];
    const level = this.level;

    if (!deltas) {
        deltas = [
            {a: -1, b: 0},
            {a: 0, b: -1},
            {a: 1, b: 0},
            {a: 0, b: 1}
        ];
    }
    return deltas.map(function (values) {
        return fromFaceIJWrap(face, [i + values.a, j + values.b], level);
    });
};
