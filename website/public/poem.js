import { MRG32k3a } from './prng.js';
import { perlin3 } from './perlin.js';

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
    petal: newImage('petal.png'),
    transition: newImage('transition.png'),
    text: [],
};

const fonts = [
    '72px Lato',
];
const d = 1.5;
const dd = 3.0;
const ddd = 7.0;

const msgs = [
    dd, 
    'Come inside', d,
    d,
    'this blizzard\nof falling apple blossoms', dd,
    dd,
    "It's light in here.", dd,
    d,
    "Let me look at you.", dd,
    dd,
    "Surrounded by all of\nthis brightness", dd,
    d,
    "flying apart, shining", dd,
    d,
    "dismantled to make room\nfor more shining.", dd,
    dd,
    "one of us should say something", dd,
    d,
    "Or we should both say something,", dd,
    { pos: [0, 40] }, "something true", dd,
    d,
    "before we were born, true", dd,
    d,
    "while we lived and true", dd,
    d,
    "after we're gone.", dd,
    dd,
    "Nowhere long,\nthese petals fall", dd,
    d,
    "out of one realm", dd,
    d,
    { curtain: 0.7 }, "and into another,\nstate after state.", dd,
    dd,
    "In the midst", dd,
    d,
    "of these petals hurrying", dd,
    d,
    "and our own falling", dd,
    { pos: [200, 30] }, "and forgetting.", dd,
    dd,
    "I look into your eyes", dd,
    d,
    "and spy over my shoulder", dd,
    d,
    { curtain: 0 }, "an avalanche of flowers\nplunging into an abyss", dd,
    ddd,
    "THE END",
    ddd,
    "Radiant Abyss by Li-Young Lee", dd,
    dd,
    "Programmed by Nathan Whitehead", dd,
    dd,
    "Music by Cobalt Rabbit", dd,
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
    // Draw petals and update
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
            let y = SCREEN_H / 2 + evt.pos[1];
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
        canvas.width = 1280;
        canvas.height = 720;
        button.replaceWith(canvas);
        const music = document.getElementById('bgmusic');
        music.volume = 0.3;
        music.play();
        main(init, draw);
    });
});
