import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LineSegments } from "three";

let stats, camera, controls, scene, renderer, mesh;

const worldWidth = 16;
const worldHeight = 256;
const worldDepth = 16;
const worldHalfWidth = worldWidth / 2;
const worldHalfDepth = worldDepth / 2;
const data = generateHeight(worldWidth, worldDepth);
const objects = [];
const blockLength = 100;

let raycaster;
let wireframesView = false;
let moveForward = false;
let moveBack = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const maxSpeed = 30000;
init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    20000
  );
  camera.position.y = getY(worldHalfWidth, worldHalfDepth) * 100 + 500;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  const geometries = [];
  const chunkList = [1];
  const lines = [];

  for (let chunk in chunkList) {
    for (let z = 0; z < worldDepth; z++) {
      for (let x = 0; x < worldWidth; x++) {
        const surfaceHeight = 20 + getY(x, z);
        for (let y = 0; y < worldHeight; y++) {
          if (y < surfaceHeight) {
            const block = new THREE.BoxGeometry(
              blockLength,
              blockLength,
              blockLength
            );

            block.translate(
              x * blockLength - worldHalfWidth * blockLength,
              y * blockLength,
              z * blockLength - worldHalfDepth * blockLength
            );
            const wireframe = new THREE.WireframeGeometry(block);
            const line = new THREE.LineSegments(wireframe);
            line.material.depthTest = false;
            line.material.opacity = 0.25;
            line.material.transparent = true;
            line.visible = false;
            lines.push(line);
            scene.add(line);

            geometries.push(block);
          }
        }
      }
    }
  }

  const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
  geometry.computeBoundingSphere();

  const texture = new THREE.TextureLoader().load("assets/textures/grass.png");
  texture.magFilter = THREE.NearestFilter;

  mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
    })
  );

  scene.add(mesh);
  objects.push(mesh);

  const ambientLight = new THREE.AmbientLight(0xcccccc);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 0.5).normalize();
  scene.add(directionalLight);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, document.body);
  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "block";
    instructions.style.display = "";
  });

  scene.add(controls.getObject());

  const onKeyPress = (event) => {
    switch (event.code) {
      case "KeyF":
        console.log("Pressed F");
        lines.forEach((line) => {
          line.visible = !wireframesView;
        });
        mesh.visible = wireframesView;
        wireframesView = !wireframesView;
        break;
    }
  };

  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBack = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "KeyC":
        moveDown = true;
        break;

      case "Space":
        moveUp = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBack = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;

      case "KeyC":
        moveDown = false;
        break;

      case "Space":
        moveUp = false;
        break;
    }
  };

  document.addEventListener("keypress", onKeyPress);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1, 0),
    0,
    10
  );

  stats = new Stats();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function generateHeight(width, height) {
  const data = [],
    perlin = new ImprovedNoise(),
    size = width * height,
    z = Math.random() * 100;

  let quality = 2;

  for (let j = 0; j < 4; j++) {
    if (j === 0) for (let i = 0; i < size; i++) data[i] = 0;

    for (let i = 0; i < size; i++) {
      const x = i % width,
        y = (i / width) | 0;
      data[i] += perlin.noise(x / quality, y / quality, z) * quality;
    }

    quality *= 4;
  }

  return data;
}

function getY(x, z) {
  return (data[x + z * worldWidth] * 0.2) | 0;
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const time = performance.now();

  if (controls.isLocked === true) {
    const delta = (time - prevTime) / 1000;
    velocity.x -= velocity.x * 10 * delta;
    velocity.z -= velocity.z * 10 * delta;
    velocity.y -= velocity.y * 10 * delta;

    direction.z = Number(moveForward) - Number(moveBack);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.y = Number(moveDown) - Number(moveUp);
    direction.normalize();

    velocity.z -= direction.z * maxSpeed * delta;
    velocity.x -= direction.x * maxSpeed * delta;
    velocity.y -= direction.y * maxSpeed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y += velocity.y * delta;
  }
  prevTime = time;

  renderer.render(scene, camera);
}
