(function() {
    var pre = document.getElementById("d");
    var A = 1, B = 1, K2 = 5, vA = 0.02, vB = 0.01;
    var SW = 120, SH = 35;

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
    setInterval(function() {
        A += vA; B += vB;
        var sw = SW, sh = SH;
        var cx = sw / 2 | 0, cy = sh / 2 | 0;
        var sx = Math.min(sw * 0.5, sh) * 0.75, sy = sx * 0.5;
        var $ = [], r = [], len = sw * sh;
        for (var e = 0; e < len; e++) {
            $[e] = e % sw === sw - 1 ? "\n" : " ";
            r[e] = 0;
        }
        var a = Math.cos(A), o = Math.sin(A), s = Math.cos(B), n = Math.sin(B);
        for (var v = 0; v < 6.28; v += 0.07) {
            var _ = Math.cos(v), c = Math.sin(v);
            for (var i = 0; i < 6.28; i += 0.02) {
                var t = Math.sin(i), f = Math.cos(i);
                var m = _ + 2, d = 1 / (t * m * o + c * a + K2);
                var g = t * m * a - c * o;
                var p = cx + sx * d * (f * m * s - g * n) | 0;
                var j = cy + sy * d * (f * m * n + g * s) | 0;
                var l = p + sw * j;
                var y = 8 * ((c * o - t * _ * a) * s - t * _ * o - c * a - f * _ * n) | 0;
                if (j >= 0 && j < sh && p >= 0 && p < sw - 1 && d > r[l]) {
                    r[l] = d;
                    $[l] = ".,-~:;=!*#$@"[y > 0 ? y : 0];
                }
            }
        }
        pre.textContent = $.join("");
    }, 50);
})();
