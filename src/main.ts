import "./main.css";

import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Noise } from "./noise";
let stats, camera, controls, scene, renderer, mesh;

const chunkWidth = 16;
const worldHeight = 64;
const chunkDepth = 16;
const worldHalfWidth = chunkWidth / 2;
const worldHalfDepth = chunkDepth / 2;
const blockLength = 100;
const objects = [];
const chunksToRender = 2;

let wireframesView = 1;
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
const blocker = document.getElementById("blocker");
const instructions = document.getElementById("instructions");
const noise = new Noise();

console.log("Executing JS!");

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    20000
  );
  camera.position.y = worldHeight;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  const geometries = [];
  const lines = [];

  for (let xOffset = 0; xOffset < chunksToRender; xOffset++) {
    for (let zOffset = 0; zOffset < chunksToRender; zOffset++) {
      for (let zIndex = 0; zIndex < chunkDepth; zIndex++) {
        const z = zIndex + zOffset * chunkDepth;
        for (let xIndex = 0; xIndex < chunkWidth; xIndex++) {
          const x = xIndex + xOffset * chunkWidth;

          for (let y = 0; y < worldHeight; y++) {
            if (shouldPlaceBlock(x, z, y)) {
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
              line.visible = false;
              lines.push(line);
              scene.add(line);

              geometries.push(block);
            }
          }
        }
      }
    }
  }

  if (geometries.length === 0) {
    geometries.push(
      new THREE.BoxGeometry(blockLength, blockLength, blockLength)
    );
  }
  const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
  geometry.computeBoundingSphere();

  const wireframe = new THREE.WireframeGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ color: 0x4080ff });
  const line = new THREE.LineSegments(wireframe, material);
  line.computeLineDistances();
  line.visible = false;

  scene.add(line);

  const texture = new THREE.TextureLoader().load(
    require("../assets/stone.png")
  );
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
  ambientLight.intensity = 0.5;
  scene.add(ambientLight);

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
    if (event.repeat) {
      console.log("Pressed F but repeated");
      return;
    }
    switch (event.code) {
      case "KeyF":
        console.log("Pressed F");
        line.visible = wireframesView % 3 === 0;
        lines.forEach((line) => {
          line.visible = wireframesView % 3 === 2;
        });
        mesh.visible = wireframesView % 3 === 1;
        wireframesView++;
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

  console.log("Adding listeners");
  document.removeEventListener("keypress", onKeyPress);
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("keyup", onKeyUp);

  document.addEventListener("keypress", onKeyPress);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function shouldPlaceBlock(x: number, z: number, y: number) {
  console.log(x, z, y);
  const noiseVal = noise.perlin3(x / 10, z / 10, y / 10);
  console.log(noiseVal);
  return noiseVal >= 0;
}

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
