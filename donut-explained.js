/**
 * ASCII Donut - Mouse-Controlled with Scroll Zoom
 * Original concept by Andy Sloane (a1k0n.net)
 *
 * This renders a spinning 3D torus (donut) using ASCII characters.
 * - Mouse position controls rotation
 * - Scroll wheel controls zoom
 */

// Get the <pre> element where we'll render the ASCII art
const outputElement = document.getElementById("d");

// Rotation angles - controlled by mouse position
let rotationX = 1;  // Rotation around the X-axis - controlled by mouse Y
let rotationZ = 1;  // Rotation around the Z-axis - controlled by mouse X

// ═══════════════════════════════════════════════════════════════════════════
// ZOOM CONTROL
// ═══════════════════════════════════════════════════════════════════════════
// K2 is the distance from the viewer to the donut.
// Smaller K2 = donut appears larger (zoomed in)
// Larger K2 = donut appears smaller (zoomed out)

let K2 = 5;           // Distance from viewer to the donut (adjustable via scroll)
const K2_MIN = 2;     // Minimum distance (max zoom in) - don't get too close!
const K2_MAX = 15;    // Maximum distance (max zoom out)

// ═══════════════════════════════════════════════════════════════════════════
// MOUSE TRACKING
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener("mousemove", function(event) {
    const normalizedX = event.clientX / window.innerWidth;
    const normalizedY = event.clientY / window.innerHeight;
    rotationZ = normalizedX * Math.PI * 2;
    rotationX = normalizedY * Math.PI * 2;
});

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL ZOOM
// ═══════════════════════════════════════════════════════════════════════════
// The wheel event's deltaY is positive when scrolling down, negative when up.
// We map this to K2: scroll up (negative deltaY) = zoom in (decrease K2)
//                    scroll down (positive deltaY) = zoom out (increase K2)

document.addEventListener("wheel", function(event) {
    // Prevent the page from scrolling
    event.preventDefault();

    // Adjust K2 based on scroll direction
    // deltaY is typically ~100 per scroll "tick", so we scale it down
    const zoomSpeed = 0.01;
    K2 += event.deltaY * zoomSpeed;

    // Clamp K2 to valid range
    K2 = Math.max(K2_MIN, Math.min(K2_MAX, K2));
}, { passive: false });

// Screen dimensions (characters)
const SCREEN_WIDTH = 120;
const SCREEN_HEIGHT = 35;

// Torus parameters
const R1 = 1;       // Radius of the tube (cross-section)
const R2 = 2;       // Distance from center of torus to center of tube

// ASCII characters ordered from dimmest to brightest
const LUMINANCE_CHARS = ".,-~:;=!*#$@";

/**
 * Renders a single frame of the spinning donut
 */
function renderFrame() {
    // Initialize the output buffer with spaces and newlines
    const output = [];         // Character at each screen position
    const zBuffer = [];        // Depth at each position (for hidden surface removal)

    for (let i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; i++) {
        output[i] = (i % SCREEN_WIDTH === SCREEN_WIDTH - 1) ? "\n" : " ";
        zBuffer[i] = 0;
    }

    // Precompute sines and cosines of rotation angles
    const sinX = Math.sin(rotationX);
    const cosX = Math.cos(rotationX);
    const sinZ = Math.sin(rotationZ);
    const cosZ = Math.cos(rotationZ);

    // Iterate over the surface of the torus using two angles:
    // theta: angle around the tube's circular cross-section (0 to 2π)
    // phi:   angle around the donut's main ring (0 to 2π)

    for (let theta = 0; theta < 2 * Math.PI; theta += 0.07) {
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let phi = 0; phi < 2 * Math.PI; phi += 0.02) {
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            // ═══════════════════════════════════════════════════════════
            // STEP 1: Calculate point on torus surface (before rotation)
            // ═══════════════════════════════════════════════════════════
            // A torus is a circle (radius R1) swept around a larger circle (radius R2)
            //
            // The parametric equations for a torus centered at origin:
            //   x = (R2 + R1*cos(theta)) * cos(phi)
            //   y = (R2 + R1*cos(theta)) * sin(phi)
            //   z = R1 * sin(theta)

            const circleX = cosTheta + R2;  // Distance from Y-axis to point on tube
            const circleY = sinTheta;       // Height of point on tube (becomes Z)

            // ═══════════════════════════════════════════════════════════
            // STEP 2: Apply 3D rotations
            // ═══════════════════════════════════════════════════════════
            // After rotation, calculate the reciprocal of Z for perspective
            const oneOverZ = 1 / (sinPhi * circleX * sinX + circleY * cosX + K2);

            // This term appears in multiple calculations
            const t = sinPhi * circleX * cosX - circleY * sinX;

            // ═══════════════════════════════════════════════════════════
            // STEP 3: Project 3D point to 2D screen coordinates
            // ═══════════════════════════════════════════════════════════
            // Perspective projection with zoom-aware scaling
            // The 30 and 15 are base scale factors for X and Y

            const screenX = Math.floor(60 + 45 * oneOverZ * (cosPhi * circleX * cosZ - t * sinZ));
            const screenY = Math.floor(17 + 22 * oneOverZ * (cosPhi * circleX * sinZ + t * cosZ));

            // ═══════════════════════════════════════════════════════════
            // STEP 4: Calculate surface luminance (lighting)
            // ═══════════════════════════════════════════════════════════
            const luminance = Math.floor(8 * (
                (circleY * sinX - sinPhi * cosTheta * cosX) * cosZ -
                sinPhi * cosTheta * sinX -
                circleY * cosX -
                cosPhi * cosTheta * sinZ
            ));

            // ═══════════════════════════════════════════════════════════
            // STEP 5: Update output buffer (with Z-buffer for depth)
            // ═══════════════════════════════════════════════════════════
            const screenIndex = screenX + SCREEN_WIDTH * screenY;

            if (screenY >= 0 && screenY < SCREEN_HEIGHT &&
                screenX >= 0 && screenX < SCREEN_WIDTH &&
                oneOverZ > zBuffer[screenIndex]) {

                zBuffer[screenIndex] = oneOverZ;
                const charIndex = luminance > 0 ? luminance : 0;
                output[screenIndex] = LUMINANCE_CHARS[charIndex];
            }
        }
    }

    // Update the display
    outputElement.textContent = output.join("");
}

/**
 * Animation loop - called every 50ms (~20 FPS)
 */
function animate() {
    renderFrame();
}

// Start the animation
setInterval(animate, 50);
