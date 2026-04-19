import { MRG32k3a } from './prng.js';
import { perlin3 } from './perlin.js';
import { animate } from './quad-shader.js';

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec2 vPosition;
uniform vec4 uColor;
uniform float uTime;
out vec4 fragColor;

// void main()
// {
//     fragColor = vec4(0.0);
//     vec4 c = vec4(0.0);
//     vec3 p;
//     float z = 0.0;
//     float d;
//     vec4 xyvec = vec4(0, 33, 11, 0);
//     vec4 cxyvec = vec4(1, 3, 5, 0);
//     float color_speed = 1.0; // -5 to 5, 0 ok
//     float rotate_speed = 0.0; // -10 to 10, 0 ok
//     float forward_speed = 1.0; // -30 to 30, 0 ok
//     float color_push = 1.2; // 0.0 to 10.0 (bw to oversat)
//     float color_spread = 0.33; // 0.0 to 5.0 (single color to too many colors)
//     float detail = 1.5;
//     float detail_level = 0.3;
//     float steps = 100.0 * detail;
//     float twist = 0.122;
//     vec2 pd;
//     for(float i; i < steps; i++)
//     {
//         p = z * normalize(gl_FragCoord.rgb * 2.0 - vec3(u_resolution, 1.0).xyy);
//         p.z -= u_time * forward_speed;
//         p.xy *= mat2(cos(-z * twist + u_time * rotate_speed * 0.1 + xyvec));
//         pd = cos(p + cos(p.yzx + p.z - u_time * rotate_speed * 0.2)).xy;
//         d = length(pd) / 6.0;
//         z += d * detail_level;
//         c += (color_push * sin(p.z * color_spread + u_time * color_speed + cxyvec) + 1.0) / d;
//     }
//     //fragColor = vec4(1.0, 1.0, 1.0, 1.0) - tanh(c * c * 0.0000001);
//     fragColor = tanh(c * c * 0.0000001);
// }


void main() {
    // vPosition.xy is in [-1..1]

    vec4 c = vec4(0.0);
    vec3 p;
    float z = 0.0;
    float d;
    vec4 xyvec = vec4(0, 33, 11, 0);
    vec4 cxyvec = vec4(1, 3, 5, 0);
    float color_speed = 1.0; // -5 to 5, 0 ok
    float rotate_speed = 0.0; // -10 to 10, 0 ok
    float forward_speed = 1.0; // -30 to 30, 0 ok
    float color_push = 1.2; // 0.0 to 10.0 (bw to oversat)
    float color_spread = 0.33; // 0.0 to 5.0 (single color to too many colors)
    float detail = 1.5;
    float detail_level = 0.3;
    int steps = 150; //int(100.0 * detail);
    float twist = 0.122;
    vec2 pd;
    float u_time = uTime;
    for(int i = 0; i < /* steps */150; i++)
    {
        vec3 coord = vec3(vPosition.x, vPosition.y, -1.0);
        vec3 ncoord = normalize(coord);

        p = z * ncoord;
        p.z -= u_time * forward_speed;
        p.xy *= mat2(cos(-z * twist + u_time * rotate_speed * 0.1 + xyvec));
        pd = cos(p + cos(p.yzx + p.z - u_time * rotate_speed * 0.2)).xy;
        d = length(pd) / 6.0;
        z += d * detail_level;
        c += (color_push * sin(p.z * color_spread + u_time * color_speed + cxyvec) + 1.0) / d;
    }
    fragColor = tanh(c * c * 0.0000001);
}
`;

const SCREEN_W = 1280;
const SCREEN_H = 720;

const SEED = 1234;
const NUM_PETALS = 100;
const CURTAIN_SPEED = 0.2;

const prng = MRG32k3a(SEED);

function uniform(low, high) {
    return prng() * (high - low) + low;
}

function newImage(src) {
    let result = new Image();
    result.src = src;
    return result;
}

let renderState = {
    time: 0,
    curtain: 1,
    curtainGoal: 1,
    lastTime: 0,
    text: [],
};

const fonts = [
    '72px FFF_Tusj',
];
const d = 1.5;
const dd = 3.0;
const ddd = 7.0;

const msgs = [
    d, 
    'THE END OF FASCISM', dd,
    d,
    'LOOKS LIKE', dd,
    d,
    'CENTURIES OF QUEERS', dd,
    d,
    'DANCING ON THE GRAVE OF', dd,
    d,
    "1. CAPITALISM", dd,
    d,
    "2. THE STATE", dd,
    d,
    "3. COLONIALISM", dd,
    d,
    "4. NAZIS", dd,
    d,
    "5. RACISM", dd,
    d,
    "6. OPPRESSION", dd,
    ddd,
    "IT WILL BE A GRAND PARTY", dd,
    d,
    "EVEN GRANDER THAN\nMARDI GRAS", dd,
    d,
    "& THERE WILL BE", d,
    d,
    "NO REASON TO SLEEP", dd,
    d,
    "B/C THERE WILL BE", d,
    d,
    "NO NEED TO WORK", dd,
    d,
    "& THERE WILL BE", d,
    d,
    "SUCH A\nREVELATORY PALLOR", dd,
    d,
    "TO THE WHOLE THING", d,
    d,
    "THE PHOTOS WILL BE", d,
    d,
    "EXQUISITE", dd,
    d,
    "& THE LIBATIONS\n& SNACKS", d,
    d,
    "FUCKING DELICIOUS", dd,
    d,
    "THERE WILL BE A", d,
    d,
    "GIANT DANCE PARTY", d,
    d,
    "& CLUB CHAI WILL DJ", d,
    d,
    "& IT WILL BE AT\nTHE STUD", d,
    d,
    "& WE'LL ALL FUCKING DANCE", dd,
    d,
    "UNTIL WE SWEAT", d,
    d,
    "HARD", d,
    d,
    "& MAKEUP RUNS", d,
    d,
    "BETWEEN FACES", d,
    dd,
    "A TRANSFERENCE", dd,
    dd,
    "A TRANSFUSION OF GLAM", dd,
    dd,
    "A FUSION OF\nSWEATING BODIES", d,
    d,
    "INTO A WHATEVER", d,
    d,
    "SINGULARITY", dd,
    d,
    "A TRANSFUSION OUT OF A", d,
    d,
    "FUCKING OPPRESSED", d,
    d,
    "MISERABLE EXISTENCE",
    d,
    { pos: [0, 80] }, "INTO A REVELRY", d,
    d,
    "A FULL BLOWN", d,
    d,
    "REVELRY OF\nQUEERNESS & DESIRE", dd,
    d,
    "THAT WE HAVE ONLY NOW", dd,
    dd,
    "JUST BARELY BEGUN\nTO IMAGINE", dd,
    dd,
    "JUST BARELY\nBEGUN TO IMAGINE", dd,
    dd,
    "JUST BARELY BEGUN\nTO IMAGINE", ddd,
    ddd,
    "THE END", dd,
    ddd,
    "Text:\nIntroduction to 'Villainy'\nby Andrea Abi-Karam", ddd,
    dd,
    "Programmed by\nNathan Whitehead", ddd,
    dd,
    "Music:\nSympathetic Resonance\nby As Seas Exhale", ddd,
    dd,
];

function compile(msgs) {
    let result = [];
    let t = 0.0;
    let font = 0;
    let align = 'center';
    let pos = [0, 0];
    let curtain = 1;
    for (const msg of msgs) {
        if (typeof msg === 'number') {
            t += msg;
            // add to keep value of last message text
            if (result.length > 0) {
                if (result[result.length - 1].keep == 0) {
                    result[result.length - 1].keep = msg;
                }
            }
        } else if (typeof msg === 'string') {
            result.push({
                t, msg, font, pos, align, pos, curtain, keep: 0,
            });
            pos = [0, 0];
        } else {
            if (msg.pos !== undefined) pos = msg.pos;
            if (msg.curtain !== undefined) curtain = msg.curtain;
        }
    }
    return result;
}

const events = compile(msgs);
console.log(events);

const TIME_SCALE = 2.0;
const FADEIN_TIME = 0.5;
const FADEOUT_TIME = 0.5;

function main(init, draw) {
    renderState.ctx = document.getElementById('canvas').getContext('2d');
    renderState.gctx = document.getElementById('glcanvas').getContext('webgl');
    renderState.startTime = Date.now();

    init();

    let f = (() => {
        draw();
        window.requestAnimationFrame(f);
    });
    f();
}

function drawRotScale(ctx, img, rot, scale, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(rot);
    // Fade to nothing at bottom of screen
    const a = y / SCREEN_H;
    ctx.globalAlpha = 1 - a * a * a * a;
    ctx.drawImage(img, -img.width * 0.5, -img.height * 0.5);
    ctx.restore();
}

function init() {
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    // Send the source to the shader object
    gl.shaderSource(shader, source);
    // Compile the shader program
    gl.compileShader(shader);
    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
            `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
        );
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(
            `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                shaderProgram
            )}`
        );
        return null;
    }
    return shaderProgram;
}

function flow(x, y, z) {
    const eps = 1e-4;
    const v0 = perlin3(x, y, z);
    const vy = perlin3(x + eps, y, z) - v0;
    const vx = -(perlin3(x, y + eps, z) - v0);
    return { vx, vy };
}

function draw() {
    renderState.time = (Date.now() - renderState.startTime) * 0.001;
    let gl = renderState.gctx;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let ctx = renderState.ctx;
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
    const t = renderState.time;
    // Draw text
    for (const evt of events) {
        if (t > evt.t && t <= evt.t + evt.keep + FADEOUT_TIME) {
            ctx.save();
            renderState.curtainGoal = evt.curtain;
            if (t > evt.t && t < evt.t + FADEIN_TIME) {
                const x = (t - evt.t) / FADEIN_TIME;
                ctx.globalAlpha = x;
            }
            if (t > evt.t + evt.keep && t <= evt.t + evt.keep + FADEOUT_TIME) {
                const x = (t - evt.t - evt.keep) / FADEOUT_TIME;
                ctx.globalAlpha = 1 - x;
            }
            const f = fonts[evt.font];
            ctx.font = f;
            const lines = evt.msg.split('\n');
            const measures = lines.map((txt) => ctx.measureText(txt));
            let maxW = 0;
            let sumH = 0;
            let ascent = measures[0].fontBoundingBoxAscent;
            for (const m of measures) {
                maxW = Math.max(maxW, m.width);
                sumH += ascent;
            }
            let x = SCREEN_W / 2 + evt.pos[0] - maxW / 2;
            let y = SCREEN_H / 2 + evt.pos[1] - sumH / 2 + ascent;
            for (let idx = 0; idx < lines.length; idx++) {
                const line = lines[idx];
                let center_dx = (maxW - measures[idx].width) / 2;
                // align left
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 20.0;
                ctx.lineJoin = 'round';
                ctx.strokeText(line, x + center_dx, y);
                ctx.fillStyle = "#fff";
                ctx.fillText(line, x + center_dx, y);
                // align center
                y += ascent;
            }
            ctx.restore();
        }
    }
    // Show abyss
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#fff';
    let region = new Path2D();
    region.moveTo(0, SCREEN_H);
    region.lineTo(SCREEN_W, SCREEN_H * renderState.curtain);
    region.lineTo(SCREEN_W, SCREEN_H);
    region.closePath();
    ctx.fill(region);

    //ctx.fillRect(0, SCREEN_H * renderState.curtain, SCREEN_W, SCREEN_H);
    ctx.restore();
    // Update curtain
    const deltaT = renderState.time - renderState.lastTime;
    if (deltaT > 0) {
        let deltaCurtain = (renderState.curtainGoal - renderState.curtain) * 0.05;
        if (Math.abs(deltaCurtain) > Math.abs(CURTAIN_SPEED * deltaT)) {
            deltaCurtain = Math.sign(deltaCurtain) * CURTAIN_SPEED * deltaT;
        }
        renderState.curtain += deltaCurtain;
    }
    renderState.lastTime = renderState.time;
}

document.addEventListener("DOMContentLoaded", async () => {
    const button = document.getElementById('play');
    button.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.id = 'canvas';
        canvas.width = SCREEN_W;
        canvas.height = SCREEN_H;
        canvas.style.position = "absolute";
        canvas.style.left = 0;
        canvas.style.top = 0;
        canvas.style.zIndex = 2;
        const glcanvas = canvas.cloneNode();
        glcanvas.id = 'glcanvas';
        glcanvas.style.zIndex = 1;
        button.replaceWith(canvas);
        canvas.parentNode.appendChild(glcanvas);
        const music = document.getElementById('bgmusic');
        music.volume = 0.3;
        music.play();

        const qs = animate(glcanvas, FRAGMENT_SHADER);
        qs.uniform4f("uColor", () => [1.0, 1.0, 0.0, 1.0]);

        main(init, draw);
    });
});
