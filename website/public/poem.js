
let renderState = {
    time: 0,
    petal: new Image(),
};

function main() {
    console.log('this is the poem');
    renderState.petal.src = 'petal.png';
    renderState.ctx = document.getElementById('canvas').getContext('2d');
    renderState.startTime = Date.now();

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
    ctx.drawImage(img, -img.width * 0.5, -img.height * 0.5);
    ctx.restore();
}

function draw() {
    renderState.time = (Date.now() - renderState.startTime) * 0.001;
    let ctx = renderState.ctx;
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    const t = renderState.time;
    drawRotScale(ctx, renderState.petal, t, 0.1, 200, 200);
}

document.addEventListener("DOMContentLoaded", async (event) => {
    main();
});

