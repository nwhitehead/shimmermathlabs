
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

function draw() {
    renderState.time = (Date.now() - renderState.startTime) * 0.001;
    let ctx = renderState.ctx;
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    let x = renderState.time * 100.0;
    ctx.fillRect(x, 0, 100, 100);
}

document.addEventListener("DOMContentLoaded", async (event) => {
    main();
});

