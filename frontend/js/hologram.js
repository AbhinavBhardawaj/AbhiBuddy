// frontend/js/hologram.js
//
// AbhiBuddy - Version 1 Hologram System
//
// Responsibilities:
// - Display the existing hologram image using Three.js
// - Add cyan holographic glow
// - Add scanlines
// - Add floating particles
// - Add subtle glitch/flicker
// - Add idle floating movement
// - Provide simple public controls for future thinking/speaking states
//
// No Gemini/API/chat logic belongs here.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// ------------------------------------------------------------
// Configuration
// ------------------------------------------------------------

const HOLOGRAM_IMAGE = "../assets/images/abhinav-hologram.png";

let container;
let scene;
let camera;
let renderer;

let hologramMesh;
let glowMesh;
let particles;

let animationFrameId;

let isThinking = false;
let isSpeaking = false;

let clock;

let baseScale = 1;
let baseY = 0;

// ------------------------------------------------------------
// Initialize the hologram
// ------------------------------------------------------------

export function initHologram(containerId = "hologram-container") {
    container = document.getElementById(containerId);

    if (!container) {
        console.error(
            `AbhiBuddy Hologram: Container "#${containerId}" was not found.`
        );
        return;
    }

    // Prevent accidental duplicate initialization.
    if (renderer) {
        console.warn("AbhiBuddy Hologram is already initialized.");
        return;
    }

    clock = new THREE.Clock();

    // --------------------------------------------------------
    // Scene
    // --------------------------------------------------------

    scene = new THREE.Scene();

    // A transparent background allows your existing website
    // background to remain visible.
    scene.background = null;

    // --------------------------------------------------------
    // Camera
    // --------------------------------------------------------

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const aspectRatio = width / height;

    camera = new THREE.OrthographicCamera(
        -aspectRatio,
        aspectRatio,
        1,
        -1,
        0.1,
        100
    );

    camera.position.z = 5;

    // --------------------------------------------------------
    // Renderer
    // --------------------------------------------------------

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(width, height);

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    // --------------------------------------------------------
    // Load hologram image
    // --------------------------------------------------------

    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
        HOLOGRAM_IMAGE,

        (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;

            createHologram(texture);
            createGlow(texture);
            createParticles();

            resizeHologram();

            animate();
        },

        undefined,

        (error) => {
            console.error(
                "AbhiBuddy Hologram: Could not load hologram image.",
                error
            );
        }
    );

    // --------------------------------------------------------
    // Responsive resizing
    // --------------------------------------------------------

    window.addEventListener("resize", handleResize);
}

// ------------------------------------------------------------
// Create main hologram plane
// ------------------------------------------------------------

function createHologram(texture) {
    const imageAspect =
        texture.image.width / texture.image.height;

    const geometry = new THREE.PlaneGeometry(
        imageAspect,
        1,
        1,
        1
    );

    /*
     * ShaderMaterial lets us manipulate the image on the GPU.
     *
     * We use it for:
     * - cyan holographic tint
     * - transparency
     * - scanlines
     * - subtle flickering
     * - small glitch displacement
     */

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,

        uniforms: {
            uTexture: {
                value: texture
            },

            uTime: {
                value: 0
            },

            uOpacity: {
                value: 0.82
            },

            uIntensity: {
                value: 1.0
            },

            uScanlineStrength: {
                value: 0.10
            }
        },

        vertexShader: `
            uniform float uTime;

            varying vec2 vUv;

            void main() {

                vUv = uv;

                vec3 position = position;

                // Very small horizontal movement.
                // This creates a subtle holographic instability.
                float glitchWave =
                    sin(position.y * 15.0 + uTime * 2.0)
                    * 0.002;

                position.x += glitchWave;

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,

        fragmentShader: `
            uniform sampler2D uTexture;
            uniform float uTime;
            uniform float uOpacity;
            uniform float uIntensity;
            uniform float uScanlineStrength;

            varying vec2 vUv;

            void main() {

                vec4 image = texture2D(uTexture, vUv);

                /*
                 * Convert the original image slightly toward
                 * a cyan holographic appearance.
                 */
                vec3 cyanTint = vec3(
                    0.15,
                    0.75,
                    1.0
                );

                vec3 hologramColor =
                    mix(
                        image.rgb,
                        image.rgb * cyanTint,
                        0.48
                    );

                /*
                 * Horizontal scanlines.
                 */
                float scanlines =
                    sin(vUv.y * 650.0) * 0.5 + 0.5;

                hologramColor *=
                    1.0 -
                    scanlines * uScanlineStrength;

                /*
                 * Gentle holographic flicker.
                 */
                float flicker =
                    0.96 +
                    sin(uTime * 8.0) * 0.025;

                hologramColor *= flicker;

                /*
                 * Slight brightness increase when thinking
                 * or speaking.
                 */
                hologramColor *= uIntensity;

                /*
                 * Keep the original image alpha if it has one.
                 * If it is a normal JPG/full-background image,
                 * the entire image will remain visible.
                 */
                float alpha =
                    image.a * uOpacity;

                gl_FragColor =
                    vec4(hologramColor, alpha);
            }
        `
    });

    hologramMesh = new THREE.Mesh(
        geometry,
        material
    );

    hologramMesh.position.set(0, 0, 0);

    scene.add(hologramMesh);

    baseScale = 1;
    baseY = hologramMesh.position.y;
}

// ------------------------------------------------------------
// Create cyan glow behind hologram
// ------------------------------------------------------------

function createGlow(texture) {

    const imageAspect =
        texture.image.width / texture.image.height;

    const geometry = new THREE.PlaneGeometry(
        imageAspect * 1.04,
        1.04
    );

    /*
     * This is a second copy of the image.
     * It is blurred visually using a shader-like
     * color/opacity treatment and additive blending.
     *
     * Keeping it behind the main image gives the
     * hologram a glowing edge.
     */

    const material = new THREE.ShaderMaterial({

        transparent: true,

        depthWrite: false,

        blending: THREE.AdditiveBlending,

        uniforms: {
            uTexture: {
                value: texture
            },

            uTime: {
                value: 0
            }
        },

        vertexShader: `
            varying vec2 vUv;

            void main() {

                vUv = uv;

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,

        fragmentShader: `
            uniform sampler2D uTexture;
            uniform float uTime;

            varying vec2 vUv;

            void main() {

                vec4 image =
                    texture2D(uTexture, vUv);

                float pulse =
                    0.75 +
                    sin(uTime * 2.0) * 0.08;

                vec3 glowColor =
                    vec3(
                        0.0,
                        0.55,
                        1.0
                    );

                float alpha =
                    image.a * 0.20 * pulse;

                gl_FragColor =
                    vec4(
                        glowColor,
                        alpha
                    );
            }
        `
    });

    glowMesh = new THREE.Mesh(
        geometry,
        material
    );

    glowMesh.position.z = -0.03;

    scene.add(glowMesh);
}

// ------------------------------------------------------------
// Create floating particles
// ------------------------------------------------------------

function createParticles() {

    const particleCount = 350;

    const positions = new Float32Array(
        particleCount * 3
    );

    const particleData = [];

    for (let i = 0; i < particleCount; i++) {

        /*
         * Spread particles around the hologram.
         */
        positions[i * 3] =
            (Math.random() - 0.5) * 3.2;

        positions[i * 3 + 1] =
            (Math.random() - 0.5) * 2.5;

        positions[i * 3 + 2] =
            (Math.random() - 0.5) * 0.5 - 0.2;

        particleData.push({
            speed:
                0.15 +
                Math.random() * 0.35,

            offset:
                Math.random() * Math.PI * 2,

            size:
                0.015 +
                Math.random() * 0.025
        });
    }

    const geometry =
        new THREE.BufferGeometry();

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            positions,
            3
        )
    );

    const material =
        new THREE.PointsMaterial({

            color: 0x29c9ff,

            size: 0.025,

            transparent: true,

            opacity: 0.65,

            blending:
                THREE.AdditiveBlending,

            depthWrite: false
        });

    particles =
        new THREE.Points(
            geometry,
            material
        );

    particles.userData.particleData =
        particleData;

    scene.add(particles);
}

// ------------------------------------------------------------
// Update particles
// ------------------------------------------------------------

function updateParticles(time) {

    if (!particles) {
        return;
    }

    const positionAttribute =
        particles.geometry.attributes.position;

    const positions =
        positionAttribute.array;

    const particleData =
        particles.userData.particleData;

    for (let i = 0; i < particleData.length; i++) {

        const data =
            particleData[i];

        const index = i * 3;

        /*
         * Slowly move particles upward.
         */
        positions[index + 1] +=
            data.speed * 0.0008;

        /*
         * Small horizontal movement.
         */
        positions[index] +=
            Math.sin(
                time * data.speed +
                data.offset
            ) * 0.0005;

        /*
         * Reset particles when they move too high.
         */
        if (positions[index + 1] > 1.5) {

            positions[index + 1] =
                -1.5 -
                Math.random() * 0.5;

            positions[index] =
                (Math.random() - 0.5) * 3.2;
        }
    }

    positionAttribute.needsUpdate = true;
}

// ------------------------------------------------------------
// Main animation loop
// ------------------------------------------------------------

function animate() {

    animationFrameId =
        requestAnimationFrame(animate);

    const elapsedTime =
        clock.getElapsedTime();

    // --------------------------------------------------------
    // Update shader time
    // --------------------------------------------------------

    if (hologramMesh) {

        hologramMesh.material.uniforms.uTime.value =
            elapsedTime;
    }

    if (glowMesh) {

        glowMesh.material.uniforms.uTime.value =
            elapsedTime;
    }

    // --------------------------------------------------------
    // Idle floating movement
    // --------------------------------------------------------

    if (hologramMesh) {

        /*
         * Gentle vertical floating.
         */
        hologramMesh.position.y =
            baseY +
            Math.sin(elapsedTime * 1.2) * 0.025;

        /*
         * Very subtle side-to-side movement.
         */
        hologramMesh.rotation.z =
            Math.sin(elapsedTime * 0.7) *
            0.003;
    }

    // Keep glow synchronized with main hologram.
    if (glowMesh && hologramMesh) {

        glowMesh.position.y =
            hologramMesh.position.y;

        glowMesh.rotation.z =
            hologramMesh.rotation.z;
    }

    // --------------------------------------------------------
    // Particle animation
    // --------------------------------------------------------

    updateParticles(elapsedTime);

    // --------------------------------------------------------
    // Thinking / speaking visual states
    // --------------------------------------------------------

    updateStateAnimation(elapsedTime);

    renderer.render(
        scene,
        camera
    );
}

// ------------------------------------------------------------
// Thinking / speaking animation
// ------------------------------------------------------------

function updateStateAnimation(time) {

    if (!hologramMesh) {
        return;
    }

    let targetIntensity = 1.0;

    /*
     * Thinking:
     * Slightly stronger holographic pulse.
     */
    if (isThinking) {

        targetIntensity =
            1.15 +
            Math.sin(time * 4.0) * 0.08;
    }

    /*
     * Speaking:
     * Slightly stronger and faster pulse.
     *
     * This is NOT lip-sync.
     * Later, audio amplitude can control this value.
     */
    if (isSpeaking) {

        targetIntensity =
            1.20 +
            Math.sin(time * 10.0) * 0.10;
    }

    const currentIntensity =
        hologramMesh.material.uniforms
            .uIntensity.value;

    hologramMesh.material.uniforms
        .uIntensity.value =
        THREE.MathUtils.lerp(
            currentIntensity,
            targetIntensity,
            0.08
        );
}

// ------------------------------------------------------------
// Set thinking state
// ------------------------------------------------------------

export function setThinking(thinking) {

    isThinking = Boolean(thinking);

    /*
     * This intentionally stays simple in Version 1.
     *
     * Later this can control:
     * - stronger particles
     * - rotating holographic rings
     * - "thinking" animation
     * - visual indicators
     */
}

// ------------------------------------------------------------
// Start speaking
// ------------------------------------------------------------

export function startSpeaking() {

    isSpeaking = true;

    /*
     * Version 1 only changes the hologram's glow.
     *
     * Later:
     *
     * TTS audio
     *      ↓
     * audio analyser
     *      ↓
     * amplitude
     *      ↓
     * mouth/head animation
     */
}

// ------------------------------------------------------------
// Stop speaking
// ------------------------------------------------------------

export function stopSpeaking() {

    isSpeaking = false;
}

// ------------------------------------------------------------
// Resize handling
// ------------------------------------------------------------

function handleResize() {

    if (!container || !renderer || !camera) {
        return;
    }

    resizeHologram();
}

function resizeHologram() {

    const width =
        container.clientWidth || 800;

    const height =
        container.clientHeight || 600;

    const aspectRatio =
        width / height;

    camera.left =
        -aspectRatio;

    camera.right =
        aspectRatio;

    camera.top = 1;
    camera.bottom = -1;

    camera.updateProjectionMatrix();

    renderer.setSize(
        width,
        height
    );
}

// ------------------------------------------------------------
// Cleanup
// ------------------------------------------------------------

export function destroyHologram() {

    if (animationFrameId) {

        cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId = null;
    }

    window.removeEventListener(
        "resize",
        handleResize
    );

    if (hologramMesh) {

        hologramMesh.geometry.dispose();

        hologramMesh.material.dispose();

        scene.remove(
            hologramMesh
        );

        hologramMesh = null;
    }

    if (glowMesh) {

        glowMesh.geometry.dispose();

        glowMesh.material.dispose();

        scene.remove(
            glowMesh
        );

        glowMesh = null;
    }

    if (particles) {

        particles.geometry.dispose();

        particles.material.dispose();

        scene.remove(
            particles
        );

        particles = null;
    }

    if (renderer) {

        renderer.dispose();

        if (
            renderer.domElement &&
            renderer.domElement.parentNode
        ) {

            renderer.domElement.parentNode
                .removeChild(
                    renderer.domElement
                );
        }

        renderer = null;
    }

    scene = null;
    camera = null;
    clock = null;
    container = null;

    isThinking = false;
    isSpeaking = false;
}