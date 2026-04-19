import { animate } from './quad-shader.js';

const FRAGMENT_SHADER = `#version 300 es

precision mediump float;

in vec2 vPosition;

uniform float uTime; // time

uniform float uColor;  // 0.0 to 10.0 (bw to oversat)
uniform float uBrightness; // 0.0 to 1.0 (black to lit)
uniform float uColorSpeed; // -5 to 5, 0 ok
uniform float uColorSpread; // 0.0 to 5.0 (single color to too many colors)
uniform float uRotateSpeed; // -10 to 10, 0 ok
uniform float uForwardSpeed; // -30 to 30, 0 ok
uniform float uDetail; // 0.3 is normal

out vec4 fragColor;

void main() {
    // vPosition.xy is in [-1..1]

    vec4 c = vec4(0.0);
    vec3 p;
    float z = 0.0;
    float d;
    vec4 xyvec = vec4(0, 33, 11, 0);
    vec4 cxyvec = vec4(1, 3, 5, 0);
    float detail = 1.5;
    float detail_level = 0.3;
    int steps = 150;
    float twist = 0.122;
    vec2 pd;
    for(int i = 0; i < /* steps */150; i++)
    {
        vec3 coord = vec3(vPosition.x, vPosition.y, -1.0);
        vec3 ncoord = normalize(coord);

        p = z * ncoord;
        p.z -= uTime * uForwardSpeed;
        p.xy *= mat2(cos(-z * twist + uTime * uRotateSpeed * 0.1 + xyvec));
        pd = cos(p + cos(p.yzx + p.z - uTime * uRotateSpeed * 0.2)).xy;
        d = length(pd) / 6.0;
        z += d * uDetail;
        c += (uColor * sin(p.z * uColorSpread + uTime * uColorSpeed + cxyvec) + 1.0) / d;
    }
    fragColor = tanh(c * c * 0.0000001) * uBrightness;
}
`;

const SCREEN_W = 1280;
const SCREEN_H = 720;

class BasicVar {
    constructor(initValue) {
        this.x = initValue;
    }
    get value() {
        return this.x;
    }
    set value(newValue) {
        this.x = newValue;
    }
    update() {}
}

class SmoothVar {
    constructor(initValue, speed) {
        this.x = initValue;
        this.goalValue = initValue;
        this.speed = speed ?? 0.01;
    }
    get value() {
        return this.x;
    }
    set value(newValue) {
        this.goalValue = newValue;
    }
    update() {
        this.x = this.x + (this.goalValue - this.x) * this.speed;
    }
}

let renderState = {
    time: 0,
    lastTime: 0,
    text: [],
    ctx: null,
    qs: null,
};

const fonts = [
    '72px FFF_Tusj',
];
const d = 1.5;
const dd = 3.0;
const ddd = 7.0;


const msgs = [
    d,
    // { uBrightness: 1, uColor: 1, uColorSpeed: 5 },
    { uColor: 0, uColorSpread: 1, uRotateSpeed: 0, uForwardSpeed: 1, uDetail: 0.1},
    ddd,
    { uDetail: 1.8 },
    ddd,
    { uDetail: 0.1 },

    dd,
    { uBrightness: 0.1 },
    'THE END OF FASCISM', dd,
    d,
    'LOOKS LIKE', dd,
    d,
    'CENTURIES OF QUEERS', dd,
    d,
    { uBrightness: 0.5 },
    { uColor: 0.5 },
    'DANCING ON THE GRAVE OF', dd,
    d,
    { uBrightness: 0.8 },
    "1. CAPITALISM", dd,
    d,
    "2. THE STATE", dd,
    d,
    { uBrightness: 1 },
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
console.log(events);

const FADEIN_TIME = 0.5;
const FADEOUT_TIME = 0.5;

function main(init, draw) {
    renderState.ctx = document.getElementById('canvas').getContext('2d');
    renderState.startTime = Date.now();

    init();

    let f = (() => {
        draw();
        window.requestAnimationFrame(f);
    });
    f();
}

function init() {
    renderState.vars = {
        uColor: new SmoothVar(1),
        uBrightness: new SmoothVar(1),
        uColorSpeed: new SmoothVar(1),
        uColorSpread: new SmoothVar(0.33),
        uRotateSpeed: new SmoothVar(0),
        uForwardSpeed: new SmoothVar(0),
        uDetail: new SmoothVar(0.3),
    };
    renderState.qs.uniform1f("uColor", () => renderState.vars.uColor.value);
    renderState.qs.uniform1f("uBrightness", () => renderState.vars.uBrightness.value);
    renderState.qs.uniform1f("uColorSpeed", () => renderState.vars.uColorSpeed.value);
    renderState.qs.uniform1f("uColorSpread", () => renderState.vars.uColorSpread.value);
    renderState.qs.uniform1f("uRotateSpeed", () => renderState.vars.uRotateSpeed.value);
    renderState.qs.uniform1f("uForwardSpeed", () => renderState.vars.uForwardSpeed.value);
    renderState.qs.uniform1f("uDetail", () => renderState.vars.uDetail.value);
}

let cached = false;

function draw() {
    renderState.time = (Date.now() - renderState.startTime) * 0.001;

    let ctx = renderState.ctx;
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
    const t = renderState.time;
    // Update smooth vars
    for (const [key, value] of Object.entries(renderState.vars)) {
        value.update();
    }
    // Process events
    for (const evt of events) {
        const shouldRender = cached === false || (t > evt.t && t <= evt.t + evt.keep + FADEOUT_TIME);
        const shouldUpdate = (t >= evt.t && renderState.lastTime < evt.t) && evt.update !== undefined;
        if (shouldUpdate) {
            // evt is a variable update event
            for (const [key, value] of Object.entries(evt.update)) {
                renderState.vars[key].value = value;
            }
        }
        if (shouldRender && evt.msg !== undefined) {
            ctx.save();
            if (cached === false) {
                ctx.globalAlpha = 0.5;
            } else if (t > evt.t && t < evt.t + FADEIN_TIME) {
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
    cached = true;

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
        renderState.qs = qs;

        main(init, draw);
    });
});
