const DEFAULT_SIZE = 1000;
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
let DIM = Math.min(WIDTH, HEIGHT);
let M = DIM / DEFAULT_SIZE;
const MARGIN = 100 * M;
const gui = new GUI({ width: 300 });

let theShader;

function preload() {
  theShader = loadShader('shader.vert', 'shader.frag');
}
function setup() {
  createCanvas(WIDTH, HEIGHT, WEBGL);
  gui.onFinishChange((event) => redraw());
  gui.hide();
}

function draw() {
  const dim = min(windowWidth, windowHeight);
  theShader.setUniform('u_resolution', [width, windowHeight]);
  theShader.setUniform('u_time', frameCount);
  shader(theShader);
  rect(0, 0, windowWidth, height);
}

window.addEventListener('keypress', (event) => {
  if (event.key === 'c' && params.debug) {
    if (gui._hidden) {
      gui.show();
    } else {
      gui.hide();
    }
  }
  if (event.key === 's') {
    saveCanvas('acd', 'png');
  }
});

function windowResized() {
  DIM = Math.min(windowWidth, windowHeight);
  M = DIM / DEFAULT_SIZE;
  resizeCanvas(windowWidth, windowHeight);
}

function touchEnded() {}

// Need to implement this so it doesn't defualt to touchEnded().
function mouseReleased() {}
