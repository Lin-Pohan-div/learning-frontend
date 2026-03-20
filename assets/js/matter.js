import Matter from "matter-js";

let area = document.querySelector("#hero");

// engine
let engine = Matter.Engine.create();

// render
let render = Matter.Render.create({
    element: area,
    engine: engine,
    options: {
        width: area.clientWidth,
        height: 680,
        wireframes: false,
        background: "transparent",
    },
});

// object
let cloud = Matter.Body.create({
    parts: [
        Matter.Bodies.circle(260, 120, 75, { render: { fillStyle: "#FF52D9" } }),
        Matter.Bodies.circle(345, 95, 95, { render: { fillStyle: "#FF52D9" } }),
        Matter.Bodies.circle(440, 120, 80, { render: { fillStyle: "#FF52D9" } }),
        Matter.Bodies.circle(360, 170, 70, { render: { fillStyle: "#FF52D9" } }),
    ],
    restitution: 0.5,
    frictionAir: 0.03,
});

let peanut = Matter.Body.create({
    parts: [
        Matter.Bodies.circle(500, 120, 85, { render: { fillStyle: "#ffcc33" } }),
        Matter.Bodies.circle(610, 180, 85, { render: { fillStyle: "#ffcc33" } }),
        Matter.Bodies.circle(710, 240, 45, { render: { fillStyle: "#ffcc33" } }),
        Matter.Bodies.circle(750, 160, 85, { render: { fillStyle: "#ffcc33" } }),
    ],
    restitution: 0.7,
    frictionAir: 0.025,
});

let vertical = Matter.Body.create({
    parts: [
        Matter.Bodies.rectangle(920, 170, 110, 240, { render: { fillStyle: "#20e3b2" } }),
        Matter.Bodies.circle(920, 50, 55, { render: { fillStyle: "#20e3b2" } }),
        Matter.Bodies.circle(920, 290, 55, { render: { fillStyle: "#20e3b2" } }),
    ],
    restitution: 0.55,
    frictionAir: 0.03,
});

let gourd = Matter.Body.create({
    parts: [
        Matter.Bodies.circle(180, 380, 80, { render: { fillStyle: "#ff6b6b" } }),
        Matter.Bodies.circle(180, 510, 100, { render: { fillStyle: "#ff6b6b" } }),
    ],
    restitution: 0.6,
    frictionAir: 0.025,
});

let snowman = Matter.Body.create({
    parts: [
        Matter.Bodies.circle(600, 150, 55, { render: { fillStyle: "#a78bfa" } }),
        Matter.Bodies.circle(600, 235, 70, { render: { fillStyle: "#a78bfa" } }),
        Matter.Bodies.circle(600, 340, 90, { render: { fillStyle: "#a78bfa" } }),
    ],
    restitution: 0.5,
    frictionAir: 0.03,
});

let triangle = Matter.Body.create({
    parts: [
        Matter.Bodies.circle(350, 500, 80, { render: { fillStyle: "#ff9f43" } }),
        Matter.Bodies.circle(490, 500, 80, { render: { fillStyle: "#ff9f43" } }),
        Matter.Bodies.circle(420, 385, 80, { render: { fillStyle: "#ff9f43" } }),
    ],
    restitution: 0.55,
    frictionAir: 0.03,
});

let dumbbell = Matter.Body.create({
    parts: [
        Matter.Bodies.circle(780, 200, 75, { render: { fillStyle: "#38bdf8" } }),
        Matter.Bodies.rectangle(780, 310, 40, 130, { render: { fillStyle: "#38bdf8" } }),
        Matter.Bodies.circle(780, 420, 75, { render: { fillStyle: "#38bdf8" } }),
    ],
    restitution: 0.6,
    frictionAir: 0.025,
});

let capsuleH = Matter.Body.create({
    parts: [
        Matter.Bodies.circle(250, 560, 65, { render: { fillStyle: "#84cc16" } }),
        Matter.Bodies.rectangle(360, 560, 160, 110, { render: { fillStyle: "#84cc16" } }),
        Matter.Bodies.circle(470, 560, 65, { render: { fillStyle: "#84cc16" } }),
    ],
    restitution: 0.5,
    frictionAir: 0.03,
});

let clover = Matter.Body.create({
    parts: [
        Matter.Bodies.circle(700, 480, 65, { render: { fillStyle: "#f43f5e" } }),
        Matter.Bodies.circle(830, 480, 65, { render: { fillStyle: "#f43f5e" } }),
        Matter.Bodies.circle(765, 415, 65, { render: { fillStyle: "#f43f5e" } }),
        Matter.Bodies.circle(765, 545, 65, { render: { fillStyle: "#f43f5e" } }),
    ],
    restitution: 0.55,
    frictionAir: 0.025,
});

// 牆壁與地板
let floor = Matter.Bodies.rectangle(area.clientWidth / 2, 780, area.clientWidth + 400, 200, {
    isStatic: true,
    render: { fillStyle: "transparent" },
});

let leftWall = Matter.Bodies.rectangle(-100, 340, 200, 1400, {
    isStatic: true,
    render: { fillStyle: "transparent" },
});

let rightWall = Matter.Bodies.rectangle(area.clientWidth + 100, 340, 200, 1400, {
    isStatic: true,
    render: { fillStyle: "transparent" },
});

let top = Matter.Bodies.rectangle(area.clientWidth / 2, -100, area.clientWidth + 400, 200, {
    isStatic: true,
    render: { fillStyle: "transparent" },
});

let mouse = Matter.Mouse.create(render.canvas);

let mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false },
    },
});

Matter.World.add(engine.world, [
    cloud, peanut, vertical,
    gourd, snowman, triangle,
    dumbbell, capsuleH, clover,
    leftWall, rightWall, top, floor,
    mouseConstraint,
]);

// run
Matter.Render.run(render);
const runner = Matter.Runner.create();
Matter.Runner.run(runner, engine);