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
    Matter.Bodies.circle(260, 120, 75, {
      render: { fillStyle: "#FF52D9" },
    }),
    Matter.Bodies.circle(345, 95, 95, {
      render: { fillStyle: "#FF52D9" },
    }),
    Matter.Bodies.circle(440, 120, 80, {
      render: { fillStyle: "#FF52D9" },
    }),
    Matter.Bodies.circle(360, 170, 70, {
      render: { fillStyle: "#FF52D9" },
    }),
  ],
  restitution: 0.5,
  frictionAir: 0.03,
});

let peanut = Matter.Body.create({
  parts: [
    Matter.Bodies.circle(500, 120, 85, {
      render: { fillStyle: "#ffcc33" },
    }),
    Matter.Bodies.circle(610, 180, 85, {
      render: { fillStyle: "#ffcc33" },
    }),
    Matter.Bodies.circle(710, 240, 45, {
      render: { fillStyle: "#ffcc33" },
    }),
    Matter.Bodies.circle(750, 160, 85, {
      render: { fillStyle: "#ffcc33" },
    }),
  ],
  restitution: 0.7,
  frictionAir: 0.025,
});

let vertical = Matter.Body.create({
  parts: [
    Matter.Bodies.rectangle(920, 170, 110, 240, {
      render: { fillStyle: "#20e3b2" },
    }),
    Matter.Bodies.circle(920, 50, 55, {
      render: { fillStyle: "#20e3b2" },
    }),
    Matter.Bodies.circle(920, 290, 55, {
      render: { fillStyle: "#20e3b2" },
    }),
  ],
  restitution: 0.55,
  frictionAir: 0.03,
});

let floor = Matter.Bodies.rectangle(
  area.clientWidth / 2,
  680,
  area.clientWidth,
  5,
  {
    isStatic: true,
    render: {
      fillStyle: "transparent",
    },
  },
);

let left = Matter.Bodies.rectangle(area.clientWidth + 5, 680 / 2, 40, 680, {
  isStatic: true,
  render: {
    fillStyle: "transparent",
  },
});

let right = Matter.Bodies.rectangle(5, 680 / 2, 40, 680, {
  isStatic: true,
  render: {
    fillStyle: "transparent",
  },
});

let top = Matter.Bodies.rectangle(
  area.clientWidth / 2,
  -20,
  area.clientWidth,
  40,
  {
    isStatic: true,
    render: {
      fillStyle: "transparent",
    },
  },
);

let mouse = Matter.Mouse.create(render.canvas);
let mouseConstraint = Matter.MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: {
      visible: false,
    },
  },
});

Matter.World.add(engine.world, [
  cloud,
  peanut,
  vertical,
  left,
  right,
  top,
  floor,
  mouseConstraint,
]);

// run
Matter.Render.run(render);

const runner = Matter.Runner.create();
Matter.Runner.run(runner, engine);
