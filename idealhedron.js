// Idealhedron: an ideal regular icosahedron in the Poincare ball model of hyperbolic space, drawn in ASCII
// with the projection, z-buffer and character ramp of the original donut.
// The 12 vertices lie on the sphere at infinity (not drawn). Each face lies on a sphere that meets that
// boundary at right angles, so the faces curve inward and adjacent faces meet at 108 degrees.
(function() {
    var pre = document.getElementById("d");
    var A = 1, B = 1, C = 0, K2 = 5, vA = 0.02, vB = 0.01, vC = 0.012;
    var SW = 120, SH = 35;
    var RAMP = ".,-~:;=!*#$@";
    var TAU = 2 * Math.PI;

    // Icosahedron: vertices (0, +-1, +-phi) and their cyclic shifts, turned so one vertex points along z
    // (the spin C then turns the figure about a 5-fold axis) and scaled onto the unit sphere.
    // Faces: triples of mutually nearest vertices (edge length 2 before scaling).
    function icosahedron() {
        var p = (1 + Math.sqrt(5)) / 2, n = Math.sqrt(1 + p * p), ay = 1 / n, az = p / n, V = [], F = [];
        [-1, 1].forEach(function(s1) {
            [-p, p].forEach(function(s2) { V.push([0, s1, s2], [s1, s2, 0], [s2, 0, s1]); });
        });
        V = V.map(function(v) { return [v[0], az * v[1] - ay * v[2], ay * v[1] + az * v[2]]; });
        function edge(a, b) {
            var dx = V[a][0] - V[b][0], dy = V[a][1] - V[b][1], dz = V[a][2] - V[b][2];
            return Math.abs(dx * dx + dy * dy + dz * dz - 4) < 1e-6;
        }
        for (var i = 0; i < 12; i++) for (var j = i + 1; j < 12; j++) for (var k = j + 1; k < 12; k++) {
            if (edge(i, j) && edge(j, k) && edge(i, k)) F.push([i, j, k]);
        }
        V = V.map(function(v) { return [v[0] / n, v[1] / n, v[2] / n]; });
        return { V: V, F: F };
    }

    // Sample the faces once. A face whose flat Klein-model plane has unit normal n at distance d from the
    // centre lies, in the Poincare model, on the sphere with centre n / d and radius sqrt(1/d^2 - 1).
    // Points are spread evenly over the part of that sphere inside the ball (uniform in cos alpha); a point
    // q is kept when its Klein image 2q / (1 + |q|^2) falls inside the flat face triangle.
    // The sphere at infinity is scaled to radius 3, the size of the donut.
    function sample(V, F, nu, nb) {
        var P = [], N = [];
        F.forEach(function(f) {
            var a = V[f[0]], b = V[f[1]], c = V[f[2]];
            var e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
            var e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
            var nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
            var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
            nx /= nl; ny /= nl; nz /= nl;
            var d = nx * a[0] + ny * a[1] + nz * a[2];
            if (d < 0) { nx = -nx; ny = -ny; nz = -nz; d = -d; }
            var rho = Math.sqrt(1 / (d * d) - 1), cmax = Math.sqrt(1 - d * d);
            var cx = nx / d, cy = ny / d, cz = nz / d;
            // w1, w2: unit vectors perpendicular to n (w1 = n x helper axis, w2 = n x w1)
            var hx = Math.abs(nx) < 0.9 ? 1 : 0, hy = 1 - hx;
            var w1x = -nz * hy, w1y = nz * hx, w1z = nx * hy - ny * hx;
            var wl = Math.sqrt(w1x * w1x + w1y * w1y + w1z * w1z);
            w1x /= wl; w1y /= wl; w1z /= wl;
            var w2x = ny * w1z - nz * w1y, w2y = nz * w1x - nx * w1z, w2z = nx * w1y - ny * w1x;
            var d00 = e1x * e1x + e1y * e1y + e1z * e1z, d01 = e1x * e2x + e1y * e2y + e1z * e2z;
            var d11 = e2x * e2x + e2y * e2y + e2z * e2z, den = d00 * d11 - d01 * d01;
            for (var i = 0; i < nu; i++) {
                var ca = cmax + (1 - cmax) * (i + 0.5) / nu, sa = Math.sqrt(1 - ca * ca);
                for (var j = 0; j < nb; j++) {
                    var t = TAU * (j + 0.5) / nb, cb = Math.cos(t), sb = Math.sin(t);
                    var dx = -nx * ca + (w1x * cb + w2x * sb) * sa;
                    var dy = -ny * ca + (w1y * cb + w2y * sb) * sa;
                    var dz = -nz * ca + (w1z * cb + w2z * sb) * sa;
                    var qx = cx + rho * dx, qy = cy + rho * dy, qz = cz + rho * dz;
                    var q2 = qx * qx + qy * qy + qz * qz;
                    if (q2 >= 1) continue;
                    var s = 2 / (1 + q2), vx = qx * s - a[0], vy = qy * s - a[1], vz = qz * s - a[2];
                    var d20 = vx * e1x + vy * e1y + vz * e1z, d21 = vx * e2x + vy * e2y + vz * e2z;
                    var bv = (d11 * d20 - d01 * d21) / den, bw = (d00 * d21 - d01 * d20) / den;
                    if (bv < 0 || bw < 0 || bv + bw > 1) continue;
                    P.push(3 * qx, 3 * qy, 3 * qz);
                    N.push(dx, dy, dz);
                }
            }
        });
        return { n: P.length / 3, P: new Float32Array(P), N: new Float32Array(N) };
    }

    var ico = icosahedron();
    var cloud = sample(ico.V, ico.F, 110, 200);

    // Responsive grid sizing
    function resize() {
        var vw = window.innerWidth, vh = window.innerHeight;
        var fs = Math.min(14, Math.max(7, vw / 100));
        var cw = fs * 0.6, ch = fs * 1.2;
        SW = Math.min(120, Math.floor(vw / cw));
        SH = Math.min(50, Math.floor(vh / ch));
        pre.style.fontSize = fs + "px";
        pre.style.lineHeight = "1.2";
    }

    resize();
    window.addEventListener("resize", resize);

    // Mouse controls
    document.addEventListener("mousemove", function(e) {
        var mx = (e.clientX / window.innerWidth - 0.5) * 2;
        var my = (e.clientY / window.innerHeight - 0.5) * 2;
        vB = 0.02 + mx * 0.8;
        vA = 0.04 + my * 0.8;
    });

    document.addEventListener("wheel", function(e) {
        e.preventDefault();
        K2 += e.deltaY * 0.01;
        K2 = Math.max(2, Math.min(15, K2));
    }, { passive: false });

    // Touch controls
    var lastPinchDist = 0;

    document.addEventListener("touchmove", function(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            var mx = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
            var my = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
            vB = 0.02 + mx * 0.8;
            vA = 0.04 + my * 0.8;
        } else if (e.touches.length === 2) {
            var dx = e.touches[0].clientX - e.touches[1].clientX;
            var dy = e.touches[0].clientY - e.touches[1].clientY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (lastPinchDist) {
                K2 -= (dist - lastPinchDist) * 0.03;
                K2 = Math.max(2, Math.min(15, K2));
            }
            lastPinchDist = dist;
        }
    }, { passive: false });

    document.addEventListener("touchend", function() {
        lastPinchDist = 0;
    });

    // Render loop
    var zb = null, lum = null, out = null;
    setInterval(function() {
        A += vA; B += vB; C += vC;
        var sw = SW, sh = SH, len = sw * sh;
        if (!zb || zb.length !== len) {
            zb = new Float32Array(len); lum = new Int8Array(len); out = new Array(len);
        }
        zb.fill(0);
        lum.fill(-1);
        var cx = sw / 2 | 0, cy = sh / 2 | 0;
        var sx = Math.min(sw * 0.5, sh) * 0.75, sy = sx * 0.5;
        var cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B), cC = Math.cos(C), sC = Math.sin(C);
        // M = Rz(B) * Rx(A) * Rz(C): A tilts, B spins in the screen plane (as in the donut), C spins about z.
        var m00 = cB * cC - sB * cA * sC, m01 = -cB * sC - sB * cA * cC, m02 = sB * sA;
        var m10 = sB * cC + cB * cA * sC, m11 = -sB * sC + cB * cA * cC, m12 = -cB * sA;
        var m20 = sA * sC, m21 = sA * cC, m22 = cA;
        var P = cloud.P, N = cloud.N;
        for (var k = 0, n3 = 3 * cloud.n; k < n3; k += 3) {
            var px = P[k], py = P[k + 1], pz = P[k + 2];
            var x = m00 * px + m01 * py + m02 * pz;
            var y = m10 * px + m11 * py + m12 * pz;
            var z = m20 * px + m21 * py + m22 * pz + K2;
            if (z < 0.05) continue; // behind or at the eye
            var d = 1 / z;
            var X = cx + sx * d * x | 0, Y = cy + sy * d * y | 0;
            if (Y < 0 || Y >= sh || X < 0 || X >= sw - 1) continue;
            var l = X + sw * Y;
            if (d <= zb[l]) continue;
            zb[l] = d;
            var qx = N[k], qy = N[k + 1], qz = N[k + 2];
            var nx = m00 * qx + m01 * qy + m02 * qz;
            var ny = m10 * qx + m11 * qy + m12 * qz;
            var nz = m20 * qx + m21 * qy + m22 * qz;
            if (nx * x + ny * y + nz * z > 0) { ny = -ny; nz = -nz; } // light the side that faces the camera
            var L = 8 * (-ny - nz) | 0; // light from top-front, as in the donut
            lum[l] = L > 0 ? L : 0;
        }
        for (var e = 0; e < len; e++) {
            out[e] = e % sw === sw - 1 ? "\n" : lum[e] < 0 ? " " : RAMP[lum[e]];
        }
        pre.textContent = out.join("");
    }, 50);
})();
