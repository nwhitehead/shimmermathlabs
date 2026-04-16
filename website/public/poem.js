import { MRG32k3a } from './prng.js';
import { perlin3 } from './perlin.js';

const SCREEN_W = 1280;
const SCREEN_H = 720;

const SEED = 1234;
const NUM_PETALS = 100;

const prng = MRG32k3a(SEED);

function uniform(low, high) {
    return prng() * (high - low) + low;
}

let renderState = {
    time: 0,
    petal: new Image(),
    text: [],
};

const fonts = [
    '72px Lato',
];

const msgs = [
    1.0,
    'Come inside', 1.0,
    1.0,
    'this blizzard\nof falling apple blossoms', 2.0,
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
            throw new Error('Unknown message type');
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

function randomPetal() {
    const x = uniform(0, SCREEN_W);
    const y = uniform(0, SCREEN_H);
    const r = uniform(0, 2 * Math.PI);
    const dr = uniform(-1, 1) * 0.02;
    const vx = uniform(-2, 2);
    const vy = uniform(0, 1) + 1.0;
    const s = 0.1;
    return {
        x,
        y,
        r,
        dr,
        vx,
        vy,
        s,
    };
}

function init() {
    renderState.petal.src = 'petal.png';
    renderState.petals = [];
    for (let i = 0; i < NUM_PETALS; i++) {
        renderState.petals.push(randomPetal());
    }
}

const BASE_PV = 0.001;
const SCALE_PV = 5.0;
const SCALE_T = 0.1;

function flow(x, y, z) {
    const eps = 1e-4;
    const v0 = perlin3(x, y, z);
    const vy = perlin3(x + eps, y, z) - v0;
    const vx = -(perlin3(x, y + eps, z) - v0);
    return { vx, vy };
}

function draw() {
    renderState.time = (Date.now() - renderState.startTime) * 0.001;
    let ctx = renderState.ctx;
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    const t = renderState.time;
    for (let p of renderState.petals) {
        drawRotScale(ctx, renderState.petal, p.r, p.s, p.x, p.y);
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.dr;
        if (p.y > SCREEN_H) {
            Object.assign(p, randomPetal());
            p.y = 0;
            p.vx = uniform(-2, 2);
        }
    }
    for (const evt of events) {
        if (t > evt.t && t <= evt.t + evt.keep + FADEOUT_TIME) {
            ctx.save();
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
            let y = SCREEN_H / 2 + evt.pos[1] - sumH / 2;
            for (let idx = 0; idx < lines.length; idx++) {
                const line = lines[idx];
                let center_dx = (maxW - measures[idx].width) / 2;
                // align left
                ctx.fillText(line, x + center_dx, y);
                // align center
                y += ascent;
            }
            ctx.restore();
        }
    }
}

document.addEventListener("DOMContentLoaded", async (event) => {
    main(init, draw);
});

