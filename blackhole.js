(function () {
  var pre = document.getElementById("d");
  var CHARS = ".,-~:;=!*#$@";
  var PI = Math.PI, TAU = 2 * PI;
  var ASPECT = 0.5; // char height/width ratio correction

  // --- Responsive grid ---
  var W, H, N, buf, zbuf;

  function measure() {
    var s = document.createElement("span");
    s.textContent = "M";
    s.style.cssText = "position:absolute;visibility:hidden;white-space:pre;";
    pre.appendChild(s);
    var cw = s.offsetWidth || 8, ch = s.offsetHeight || 16;
    pre.removeChild(s);
    W = Math.min(280, Math.max(40, Math.floor(window.innerWidth / cw)));
    H = Math.min(90, Math.max(20, Math.floor(window.innerHeight / ch)));
    N = W * H;
    buf = new Array(N);
    zbuf = new Float32Array(N);
    needsRender = true;
  }

  // --- State ---
  var A = PI / 3;        // inclination (viewing angle from pole)
  var B = 0;             // azimuthal rotation
  var vA = 0.0, vB = 0.02;
  var K2 = 5;            // zoom / distance
  var needsRender = true;

  // --- Mouse/scroll ---
  document.addEventListener("mousemove", function (e) {
    var mx = (e.clientX / window.innerWidth - 0.5) * 2;
    var my = (e.clientY / window.innerHeight - 0.5) * 2;
    vB = 0.01 + mx * 0.03;
    vA = my * 0.02;
  });

  document.addEventListener("wheel", function (e) {
    e.preventDefault();
    K2 += e.deltaY * 0.01;
    if (K2 < 2) K2 = 2;
    if (K2 > 12) K2 = 12;
  }, { passive: false });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });

  // --- Render loop ---
  function render() {
    if (!buf) return;
    A += vA;
    B += vB;

    var cosA = Math.cos(A), sinA = Math.sin(A);
    var cosB = Math.cos(B), sinB = Math.sin(B);

    // Clear buffers
    for (var i = 0; i < N; i++) {
      buf[i] = (i % W === W - 1) ? "\n" : " ";
      zbuf[i] = 0;
    }

    var hW = W / 2, hH = H / 2;
    var scale = Math.min(hW, hH / ASPECT) * 0.8;

    // Shadow radius in world units
    var shadowR = 1.8;

    // === ACCRETION DISK ===
    // Parametric ring: sample by angle (theta) around the disk and radius (r)
    // Disk lies in the x-z plane (y=0), BH at origin
    var rInner = 2.2, rOuter = 5.5;
    var rSteps = 30, tSteps = 300;

    for (var ri = 0; ri < rSteps; ri++) {
      var r = rInner + (rOuter - rInner) * ri / rSteps;
      // Brightness: hotter near inner edge
      var heat = Math.max(0, 1 - (r - rInner) / (rOuter - rInner));
      heat = heat * heat * 0.7 + 0.3 * heat; // nonlinear falloff

      for (var ti = 0; ti < tSteps; ti++) {
        var theta = TAU * ti / tSteps;

        // Point on disk in BH frame (disk in x-z plane)
        var px = r * Math.cos(theta);
        var py = 0;
        var pz = r * Math.sin(theta);

        // Rotate by inclination A (around x-axis)
        var y1 = py * cosA - pz * sinA;
        var z1 = py * sinA + pz * cosA;
        var x1 = px;

        // Rotate by azimuth B (around y-axis)
        var x2 = x1 * cosB + z1 * sinB;
        var y2 = y1;
        var z2 = -x1 * sinB + z1 * cosB;

        // Perspective projection
        var depth = z2 + K2;
        if (depth < 0.5) continue;
        var invD = 1 / depth;

        var sx = hW + x2 * invD * scale;
        var sy = hH + y2 * invD * scale * ASPECT;

        var ix = Math.floor(sx);
        var iy = Math.floor(sy);
        if (ix < 0 || ix >= W - 1 || iy < 0 || iy >= H) continue;

        // Check if this point is occluded by the black hole shadow
        // Project shadow circle (at origin) to screen
        var shadowDepth = K2; // BH is at z=0 before rotation
        var shadowInvD = 1 / shadowDepth;
        var shadowScreenR = shadowR * shadowInvD * scale;

        // Distance from this pixel to screen center (where BH projects)
        var dx = sx - hW;
        var dy = (sy - hH) / ASPECT;
        var pixDist = Math.sqrt(dx * dx + dy * dy);

        // Occlude if the point is behind the BH and projects inside the shadow
        if (z2 > 0 && pixDist < shadowScreenR) continue;

        // Doppler beaming: approaching side brighter
        // The disk rotates, so use theta to determine approaching/receding
        var doppler = 1 + 0.5 * Math.sin(theta);

        // Surface normal for disk is (0,1,0) in BH frame, rotate it
        var nx = 0;
        var ny = cosA;
        var nz = sinA;
        // After B rotation
        var nnx = nx * cosB + nz * sinB;
        var nny = ny;
        var nnz = -nx * sinB + nz * cosB;
        // Simple diffuse lighting from viewer direction (0,0,-1)
        var light = Math.abs(nnz) * 0.5 + 0.5;

        var brightness = heat * doppler * light;
        var charIdx = Math.floor(brightness * 11);
        if (charIdx < 0) charIdx = 0;
        if (charIdx > 11) charIdx = 11;

        var bufIdx = iy * W + ix;
        if (invD > zbuf[bufIdx]) {
          zbuf[bufIdx] = invD;
          buf[bufIdx] = CHARS[charIdx];
        }
      }
    }

    // === LENSED IMAGE (secondary arc) ===
    // The gravitational lensing makes the back side of the disk visible
    // as a bright arc wrapping over the top and under the bottom of the shadow.
    // We model this as a second set of disk samples, drawn at a position
    // that hugs the shadow boundary.
    for (var ri = 0; ri < 15; ri++) {
      var r = rInner + (rOuter * 0.5 - rInner) * ri / 15;
      var heat = Math.max(0, 1 - (r - rInner) / (rOuter - rInner));
      heat = heat * heat * 0.6;

      for (var ti = 0; ti < tSteps; ti++) {
        var theta = TAU * ti / tSteps;

        var px = r * Math.cos(theta);
        var py = 0;
        var pz = r * Math.sin(theta);

        // Rotate
        var y1 = py * cosA - pz * sinA;
        var z1 = py * sinA + pz * cosA;
        var x1 = px;
        var x2 = x1 * cosB + z1 * sinB;
        var y2 = y1;
        var z2 = -x1 * sinB + z1 * cosB;

        // Only show the far side (behind BH)
        if (z2 < 0.2) continue;

        var depth = z2 + K2;
        if (depth < 0.5) continue;
        var invD = 1 / depth;

        var sx = hW + x2 * invD * scale;
        var sy = hH + y2 * invD * scale * ASPECT;

        // This is the lensed image: "bend" it around the shadow
        // Compute screen-space offset from center
        var dx = sx - hW;
        var dy = (sy - hH) / ASPECT;
        var pixDist = Math.sqrt(dx * dx + dy * dy);
        var shadowInvD = 1 / K2;
        var shadowScreenR = shadowR * shadowInvD * scale;

        if (pixDist < shadowScreenR * 0.3) continue;

        // Compress the far-side image toward the shadow edge
        if (pixDist > 0.01) {
          var targetDist = shadowScreenR + (pixDist - shadowScreenR) * 0.3;
          var ratio = targetDist / pixDist;
          var newSx = hW + dx * ratio;
          var newSy = hH + dy * ratio * ASPECT;
          sx = newSx;
          sy = newSy;
        }

        var ix = Math.floor(sx);
        var iy = Math.floor(sy);
        if (ix < 0 || ix >= W - 1 || iy < 0 || iy >= H) continue;

        // Don't draw inside shadow
        dx = sx - hW;
        dy = (sy - hH) / ASPECT;
        pixDist = Math.sqrt(dx * dx + dy * dy);
        if (pixDist < shadowScreenR) continue;

        var doppler = 1 + 0.4 * Math.sin(theta);
        var brightness = heat * doppler * 0.8;
        var charIdx = Math.floor(brightness * 11);
        if (charIdx < 0) charIdx = 0;
        if (charIdx > 11) charIdx = 11;

        var bufIdx = iy * W + ix;
        // Lensed image draws on top (higher z-priority) since it's light bent around
        var lensZ = invD + 0.01;
        if (lensZ > zbuf[bufIdx]) {
          zbuf[bufIdx] = lensZ;
          buf[bufIdx] = CHARS[charIdx];
        }
      }
    }

    // === PHOTON RING ===
    // Bright ring right at the shadow edge
    var shadowInvD = 1 / K2;
    var shadowScreenR = shadowR * shadowInvD * scale;
    for (var ti = 0; ti < 600; ti++) {
      var ang = TAU * ti / 600;
      // Ring at shadow edge, slightly outside
      for (var dr = 0; dr < 2; dr++) {
        var rr = shadowScreenR + dr * 0.8;
        var rx = hW + Math.cos(ang) * rr;
        var ry = hH + Math.sin(ang) * rr * ASPECT;
        var ix = Math.floor(rx);
        var iy = Math.floor(ry);
        if (ix < 0 || ix >= W - 1 || iy < 0 || iy >= H) continue;

        var bufIdx = iy * W + ix;
        // Only draw if nothing brighter is there (disk in front takes priority)
        var ringZ = shadowInvD + 0.005;
        if (ringZ > zbuf[bufIdx]) {
          zbuf[bufIdx] = ringZ;
          // Brightness varies slightly with angle for visual interest
          var bright = 8 + Math.floor(Math.sin(ang * 2 + B) * 2);
          if (bright < 6) bright = 6;
          if (bright > 11) bright = 11;
          buf[bufIdx] = CHARS[bright];
        }
      }
    }

    pre.textContent = buf.join("");
  }

  // --- Start ---
  measure();
  setInterval(render, 50);
})();
