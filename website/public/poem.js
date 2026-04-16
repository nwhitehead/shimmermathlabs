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
    { fontFamily: "Lato", fontSize: 72 },
];

const events = [
    { t: 2.0, msg: "Come inside", font: 0, pos: [500, 400], keep: 2.0 },
    { t: 5.0, msg: "this blizzard of falling apple blossoms", font: 0, pos: [500, 600], keep: 2.0 },
];

const TIME_SCALE = 2.0;

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
}

function handleEvent(evt) {
    console.log('Handling', evt);
    const elem = document.createElement('div');
    elem.innerText = evt.msg;
    elem.style.position = 'fixed';
    const f = fonts[evt.font];
    elem.style.fontFamily = f.fontFamily;
    elem.style.fontSize = `${f.fontSize}px`;
    elem.style.left = `${evt.pos[0]}px`;
    elem.style.top = `${evt.pos[1]}px`;
    elem.classList.add('fadein-text');
    document.body.appendChild(elem);
    setTimeout(() => {
        elem.classList.add('fadeout-text');
    }, evt.keep * 1000 * TIME_SCALE);
}

document.addEventListener("DOMContentLoaded", async (event) => {
    main(init, draw);
    for (const evt of events) {
        setTimeout(handleEvent, evt.t * 1000 * TIME_SCALE, evt);
    }
});

