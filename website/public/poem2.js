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

class BasicVar {
    constructor(initValue) {
        this.x = initValue;
        this.prev = initValue;
    }
    get value() {
        return this.x;
    }
    set value(newValue) {
        this.x = newValue;
    }
    setInstant(newValue) {
        this.x = newValue;
    }
    update() {
        this.prev = this.x;
    }
}

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

class Smooth4Var {
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
    setInstant(newValue) {
        this.x = newValue;
        this.goalValue = newValue;
    }
    update() {
        for (let i = 0; i < 4; i++) {
            this.x[i] = this.x[i] + (this.goalValue[i] - this.x[i]) * this.speed;
        }
    }
}

let renderState = {
    time: 0,
    lastTime: -1, // make sure it is less than time
    text: [],
    ctx: null,
    qs: null,
    knobs: (new Array(16)).fill(64),
};

const fonts = [
    '72px FFF_Tusj',
];
const d = 1.5;
const dd = 3.0;
const ddd = 7.0;

const msgs = [
    dd,
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
        let v = interp(renderState.knobs[5], -30.0, 30.0) - renderState.vars.uForwardSpeed;
        if (v !== renderState.vars.uRotateSpeed) {
            const t = renderState.qs.time;
            // correct offset for changing speed
            renderState.vars.uRotateOffset -= v * t * 0.1 - (renderState.vars.uRotateSpeed ?? 0) * t * 0.1;
            renderState.vars.uRotateSpeed = v;
        }
        return v;
    });

    renderState.qs.uniform4f("uColorTilt", [1, 2, 5, 0]);
    renderState.qs.uniform1f("uZOffset", () => renderState.vars.uZOffset);
    renderState.qs.uniform1f("uColorSpreadOffset", () => renderState.vars.uColorSpreadOffset);
    renderState.qs.uniform1f("uRotateOffset", () => renderState.vars.uRotateOffset);
}

let cached = false;

function draw() {
    renderState.time = (Date.now() - renderState.startTime) * 0.001;

    let ctx = renderState.ctx;
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
    const t = renderState.time;
    // Update smooth vars
    // Lock out rendering so we update all vars "simultaneously"
    // renderState.qs.shouldRender = false;
    // for (const [key, value] of Object.entries(renderState.vars)) {
    //     value.update();
    //     if (key === 'uForwardSpeed') {
    //         if (value.prev !== value.value) {
    //             const t = renderState.qs.time;
    //             renderState.vars.uZOffset.value -= value.value * t - value.prev * t;
    //         }
    //     }
    // }
    // renderState.qs.shouldRender = true;

    // Process events
    for (const evt of events) {
        const shouldRender = cached === false || (t > evt.t && t <= evt.t + evt.keep + FADEOUT_TIME);
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

function listInputsAndOutputs(midiAccess) {
  for (const entry of midiAccess.inputs) {
    const input = entry[1];
    console.log(
      `Input port [type:'${input.type}']` +
        ` id:'${input.id}'` +
        ` manufacturer:'${input.manufacturer}'` +
        ` name:'${input.name}'` +
        ` version:'${input.version}'`,
    );
  }

  for (const entry of midiAccess.outputs) {
    const output = entry[1];
    console.log(
      `Output port [type:'${output.type}'] id:'${output.id}' manufacturer:'${output.manufacturer}' name:'${output.name}' version:'${output.version}'`,
    );
  }
}

function onMIDIMessage(event) {
    if (event.data[0] === 0xf8) {
        return;
    }
    if (event.data[0] === 0xb0) {
        const controller = event.data[1];
        if (controller >= 0x15 && controller <= 0x1c) {
            const idx = controller - 0x15;
            renderState.knobs[idx] = event.data[2];
            console.log(renderState.knobs);
        }
    }
}

function startLoggingMIDIInput(midiAccess) {
    midiAccess.inputs.forEach((entry) => {
        entry.onmidimessage = onMIDIMessage;
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const button = document.getElementById('play');
    const midiaccess = await navigator.requestMIDIAccess();
    listInputsAndOutputs(midiaccess);
    startLoggingMIDIInput(midiaccess);

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
