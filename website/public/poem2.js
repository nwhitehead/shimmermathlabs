import { animate } from './quad-shader.js';

const FRAGMENT_SHADER = `#version 300 es

precision highp float;

in vec2 vPosition;

uniform float uTime; // time

uniform float uColor;  // 0.0 to 10.0 (bw to oversat)
uniform float uBrightness; // 0.0 to 1.0 (black to lit)
uniform float uColorSpeed; // -5 to 5, 0 ok
uniform float uColorSpread; // 0.0 to 5.0 (single color to too many colors)
uniform float uRotateSpeed; // -10 to 10, 0 ok
uniform float uForwardSpeed; // -30 to 30, 0 ok
uniform float uDetail; // 0.3 is normal
uniform vec4 uColorTilt; // chooses palette of random colors

// Offsets are for smoothing changing speeds without flickering
uniform float uZOffset;
uniform float uColorSpreadOffset;
uniform float uRotateOffset;


out vec4 fragColor;

void main() {
    // vPosition.xy is in [-1..1]
    const float PI = 3.14159265359;

    vec4 c = vec4(0.0);
    vec3 p;
    float z = 0.0;
    float d;
    vec4 xyvec = vec4(0, 33, 11, 0);
    float twist = 0.122;
    vec2 pd;
    for(int i = 0; i < 150; i++)
    {
        vec3 coord = vec3(vPosition.x, vPosition.y, -1.0);
        vec3 ncoord = normalize(coord);

        p = z * ncoord;
        p.z -= uTime * uForwardSpeed + uZOffset;
        p.xy *= mat2(cos(-z * twist + uTime * uRotateSpeed * 0.1 + uRotateOffset + xyvec));
        pd = cos(p + cos(p.yzx + p.z - uTime * uRotateSpeed * 0.1 - uRotateOffset)).xy;
        d = length(pd) / 6.0;
        z += d * uDetail;
        c += (uColor * sin(p.z * uColorSpread + uTime * uColorSpeed + uColorSpreadOffset + uColorTilt) + 1.0) / d;
    }
    fragColor = vec4((tanh((c / 1000.0) * (c / 1000.0) * 0.1) * uBrightness).rgb, 1.0);
}
`;

const SCREEN_W = 1280;
const SCREEN_H = 720;
const START_TIME = 0;
const END_TIME = 240;
const FADEIN_TIME = 0.5;
const FADEOUT_TIME = 0.5;


class SmoothVar {
    constructor(initValue, speed) {
        this.x = initValue;
        this.prev = initValue;
        this.goalValue = initValue;
        this.speed = speed ?? 0.01;
    }
    get value() {
        return this.x;
    }
    set value(newValue) {
        this.goalValue = newValue;
    }
    setInstant(newValue) {
        this.x = newValue;
        this.goalValue = newValue;
    }
    update() {
        this.prev = this.x;
        this.x = this.x + (this.goalValue - this.x) * this.speed;
    }
}

let renderState = {
    time: START_TIME,
    lastTime: -1, // make sure it is less than time
    text: [],
    ctx: null,
    qs: null,
    knobs: (new Array(16)).fill(64),
    svars: {
        brightness: new SmoothVar(0),
        color: new SmoothVar(0),
        spread: new SmoothVar(0),
        detail: new SmoothVar(0),
        forward: new SmoothVar(0),
        rotate: new SmoothVar(0),
        tilt: new SmoothVar(0),
    },
};

const fonts = [
    '72px FFF_Tusj',
];
const d = 1.5;
const dd = 3.0;
const ddd = 7.0;

const msgs = [
    { brightness: 20, color: 0, spread: 64, detail: 20, forward: 80, rotate: 64, tilt: 0 },
    dd,
    'THE END OF FASCISM', dd,
    d,
    { brightness: 40 },
    'LOOKS LIKE', dd,
    d,
    { brightness: 60 },
    'CENTURIES OF QUEERS', dd,
    d,
    { brightness: 80 },
    'DANCING ON THE GRAVE OF', dd,
    d,
    { brightness: 100, color: 20 },
    "1. CAPITALISM", dd,
    d,
    { brightness: 127 },
    "2. THE STATE", dd,
    d,
    { color: 40 },
    "3. COLONIALISM", dd,
    d,
    "4. NAZIS", dd,
    d,
    { color: 60, detail: 30 },
    "5. RACISM", dd,
    d,
    "6. OPPRESSION", dd,
    ddd,
    { brightness: 127, color: 60, spread: 64, detail: 30, forward: 80, rotate: 64, tilt: 0 },
    { detail: 40, forward: 86 },
    "IT WILL BE A GRAND PARTY", dd,
    d,
    { tilt: 64 },
    "EVEN GRANDER THAN\nMARDI GRAS", dd,
    d,
    "& THERE WILL BE", d,
    d,
    { forward: 90, tilt: 75 },
    "NO REASON TO SLEEP", dd,
    d,
    "B/C THERE WILL BE", d,
    d,
    { detail: 50 },
    "NO NEED TO WORK", dd,
    d,
    "& THERE WILL BE", d,
    d,
    { spread: 80 },
    "SUCH A\nREVELATORY PALLOR", dd,
    d,
    { brightness: 127, color: 60, spread: 80, detail: 50, forward: 90, rotate: 64, tilt: 75 },
    "TO THE WHOLE THING", d,
    d,
    "THE PHOTOS WILL BE", d,
    d,
    { spread: 30, forward: 64, detail: 90 },
    "EXQUISITE", dd,
    { forward: 90, detail: 60, tilt: 0 },
    d,
    { spread: 50 },
    "& THE LIBATIONS\n& SNACKS", d,
    d,
    "FUCKING DELICIOUS", dd,
    d,
    { brightness: 127, color: 60, spread: 50, detail: 60, forward: 90, rotate: 64, tilt: 0 },
    "THERE WILL BE A", d,
    d,
    "GIANT DANCE PARTY", d,
    { rotate: 64 + 50 },
    d,
    "& CLUB CHAI WILL DJ", d,
    d,
    "& IT WILL BE AT\nTHE STUD", d,
    d,
    { rotate: 64 - 50 },
    "& WE'LL ALL FUCKING DANCE", dd,
    d,
    "UNTIL WE SWEAT", d,
    d,
    { rotate: 64 },
    { brightness: 127, color: 60, spread: 50, detail: 60, forward: 90, rotate: 64, tilt: 0 },
    "HARD", d,
    d,
    { color: 80, detail: 40, spread: 80 },
    "& MAKEUP RUNS", d,
    d,
    "BETWEEN FACES", d,
    dd,
    { forward: 80, tilt: 80 },
    "A TRANSFERENCE", dd,
    dd,
    { color: 100, },
    "A TRANSFUSION OF GLAM", dd,
    dd,
    { color: 110, forward: 70, tilt: 80 },
    "A FUSION OF\nSWEATING BODIES", d,
    d,
    { color: 100, forward: 67, },
    { brightness: 127, color: 100, spread: 80, detail: 60, forward: 67, rotate: 64, tilt: 80 },
    "INTO A WHATEVER", d,
    d,
    { color: 64, forward: 64, detail: 127, rotate: 75, tilt: 127 },
    "SINGULARITY", dd,
    d,
    { color: 50, forward: 40, detail: 64, rotate: 64 }, 
    "A TRANSFUSION OUT OF A", d,
    d,
    { color: 40 }, 
    "FUCKING OPPRESSED", d,
    d,
    { brightness: 100, color: 30 }, 
    "MISERABLE EXISTENCE",
    d,
    { brightness: 100, color: 30, spread: 80, detail: 64, forward: 40, rotate: 64, tilt: 127 },
    { pos: [0, 80] }, "INTO A REVELRY", d,
    d,
    "A FULL BLOWN", d,
    d,
    { tilt: 64, detail: 50 },
    "REVELRY OF\nQUEERNESS & DESIRE", dd,
    d,
    "THAT WE HAVE ONLY NOW", dd,
    dd,
    { detail: 40, color: 15 },
    "JUST BARELY BEGUN\nTO IMAGINE", dd,
    dd,
    { color: 10, detail: 30 },
    "JUST BARELY BEGUN\nTO IMAGINE", dd,
    dd,
    { color: 5, detail: 20, brightness: 80 },
    "JUST", d,
    d,
    { color: 0, brightness: 60 },
    "BARELY BEGUN", d,
    d, 
    { brightness: 40 },
    "TO IMAGINE", ddd,
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
                t, msg, font, pos, align, pos, keep: 0,
            });
            pos = [0, 0];
        } else {
            if (msg.pos !== undefined) {
                pos = msg.pos;
            } else {
                // Var set
                result.push({
                    t, update: msg,
                });
            }
        }
    }
    return result;
}

const events = compile(msgs);

function main(init, draw) {
    renderState.ctx = document.getElementById('canvas').getContext('2d');
    renderState.startTime = performance.now();

    const videoStream = document.getElementById('canvas').captureStream(60);
    const mediaRecorder = new MediaRecorder(videoStream, {
        videoBitsPerSecond: 25e6,
    });
    let chunks = [];
    mediaRecorder.addEventListener('dataavailable', (e) => {
        chunks.push(e.data);
    });
    mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        chunks = [];
        const dlUrl = URL.createObjectURL(blob);
        const link = document.createElement("a")
        link.download = "canvas-capture.mp4";
        link.href = dlUrl;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(dlUrl);
    });
    mediaRecorder.start();
    
    init();

    let f = (async () => {
        draw(true);
        if (renderState.time < END_TIME) {
            window.requestAnimationFrame(f);
        } else {
            mediaRecorder.stop();
        }
    });
    f();

}

function interp(x, lo, hi, f) {
    if (x === undefined) {
        return lo;
    }
    let y = x / 127;
    if (f !== undefined) {
        y = f(y);
    }
    return lo + (hi - lo) * y;
}

function init() {
    renderState.vars = {
        uZOffset: 0,
        uForwardSpeed: 0,
        uColorSpread: 0,
        uColorSpreadOffset: 0,
        uRotateOffset: 0,
    };
    renderState.qs.uniform1f("uBrightness", () => interp(renderState.knobs[0], 0.0, 2.0, (y) => y * y));
    renderState.qs.uniform1f("uColor", () => interp(renderState.knobs[1], 0.0, 2.0));
    renderState.qs.uniform1f("uColorSpeed", 1);
    renderState.qs.uniform1f("uColorSpread", () => {
        const v = interp(renderState.knobs[2], 0.0, 5.0, (y) => y * y * y);
        if (v !== renderState.vars.uColorSpread) {
            const t = renderState.qs.time;
            // correct offset for changing spread
            const pz0 = -(t * renderState.vars.uForwardSpeed + renderState.vars.uZOffset);
            renderState.vars.uColorSpreadOffset -= v * pz0 - (renderState.vars.uColorSpread ?? 0) * pz0;
            renderState.vars.uColorSpread = v;
        }
        return v;
    });
    renderState.qs.uniform1f("uDetail", () => interp(renderState.knobs[3], 0.1, 3.0, (y) => y * y));
    renderState.qs.uniform1f("uForwardSpeed", () => {
        let v = interp(renderState.knobs[4], -30, 30, (y) => ((y * 2 - 1) * (y * 2 - 1) * (y * 2 - 1) + 1) / 2);
        if (v !== renderState.vars.uForwardSpeed) {
            const t = renderState.qs.time;
            // correct offset for changing speed
            renderState.vars.uZOffset -= v * t - renderState.vars.uForwardSpeed * t;
            renderState.vars.uForwardSpeed = v;
        }
        return v;
    });
    renderState.qs.uniform1f("uRotateSpeed", () => {
        let v = interp(renderState.knobs[5], -30.0, 30.0, (y) => ((y * 2 - 1) * (y * 2 - 1) * (y * 2 - 1) + 1) / 2) - renderState.vars.uForwardSpeed;
        if (v !== renderState.vars.uRotateSpeed) {
            const t = renderState.qs.time;
            // correct offset for changing speed
            renderState.vars.uRotateOffset -= v * t * 0.1 - (renderState.vars.uRotateSpeed ?? 0) * t * 0.1;
            renderState.vars.uRotateSpeed = v;
        }
        return v;
    });

    renderState.qs.uniform4f("uColorTilt", () => {
        return [
            1,
            interp(renderState.knobs[6], 0, 5), 
            5,
            0];
    });
    renderState.qs.uniform1f("uZOffset", () => renderState.vars.uZOffset);
    renderState.qs.uniform1f("uColorSpreadOffset", () => renderState.vars.uColorSpreadOffset);
    renderState.qs.uniform1f("uRotateOffset", () => renderState.vars.uRotateOffset);
    renderState.qs.uniform1f("uAspectRatio", SCREEN_W / SCREEN_H);
}

function draw(drawText) {
    // renderState.time += 1/60;//(performance.now() - renderState.startTime) * 0.001;
    renderState.time = (performance.now() - renderState.startTime) * 0.001 + 35;
    renderState.qs.time = renderState.time;

    let ctx = renderState.ctx;
    const glcanvas = document.getElementById('glcanvas');
    ctx.drawImage(glcanvas, 0, 0);
    const t = renderState.time;

    // Update vars to knobs
    renderState.knobs[0] = renderState.svars.brightness.value;
    renderState.knobs[1] = renderState.svars.color.value;
    renderState.knobs[2] = renderState.svars.spread.value;
    renderState.knobs[3] = renderState.svars.detail.value;
    renderState.knobs[4] = renderState.svars.forward.value;
    renderState.knobs[5] = renderState.svars.rotate.value;
    renderState.knobs[6] = renderState.svars.tilt.value;
    for (const [key, value] of Object.entries(renderState.svars)) {
        value.update();
    }

    // Process events
    for (const evt of events) {
        const shouldRender = (t > evt.t && t <= evt.t + evt.keep + FADEOUT_TIME) && drawText;
        const shouldUpdate = (t >= evt.t && renderState.lastTime < evt.t) && evt.update !== undefined;
        if (shouldUpdate) {
            // evt is a variable update event
            for (const [key, value] of Object.entries(evt.update)) {
                if (t === 0) {
                    renderState.svars[key].setInstant(value);
                } else {
                    renderState.svars[key].value = value;
                }
            }
        }
        if (shouldRender && evt.msg !== undefined) {
            ctx.save();
            if (t > evt.t && t < evt.t + FADEIN_TIME) {
                const x = (t - evt.t) / FADEIN_TIME;
                ctx.globalAlpha = x;
            } else if (t > evt.t + evt.keep && t <= evt.t + evt.keep + FADEOUT_TIME) {
                const x = (t - evt.t - evt.keep) / FADEOUT_TIME;
                ctx.globalAlpha = 1 - x;
            }
            const f = fonts[evt.font];
            ctx.font = f;
            const lines = evt.msg.split('\n');
            const measures = lines.map((txt) => ctx.measureText(txt));
            let maxW = 0;
            let sumH = 0;
            let ascent = measures[0].fontBoundingBoxAscent * 1.25;
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
                ctx.lineWidth = 40.0;
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
        glcanvas.width = SCREEN_W;
        glcanvas.height = SCREEN_H;
        glcanvas.style.zIndex = 1;
        button.replaceWith(canvas);
        canvas.parentNode.appendChild(glcanvas);
        const music = document.getElementById('bgmusic');
        music.volume = 0.3;
        music.play();
        const qs = animate(glcanvas, FRAGMENT_SHADER, /* manualTime= */ true);
        renderState.qs = qs;
        renderState.qs.time = 0;

        main(init, draw);
    });
});
