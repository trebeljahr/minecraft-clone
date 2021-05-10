import "./main.css";

import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { addLights } from "./lights";
import { blockLength, worldHeight } from "./constants";
import { chunkSize, generateChunk, halfChunk } from "./createChunk";
import {
  addListeners,
  moveBack,
  moveDown,
  moveForward,
  moveLeft,
  moveRight,
  moveUp,
} from "./controls";

let camera, controls, lastChunk, scene, renderer;
let wireframesView = 2;
let rendering = false;
const chunks = new Map<THREE.Vector3, Uint8Array>();
const chunksToRender = 3;
const chunksToRenderDown = 2;
const objects = [];
const lines = [];
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const maxSpeed = 1;
const blocker = document.getElementById("blocker");
const instructions = document.getElementById("instructions");
const object = new THREE.Object3D();
let prevTime = performance.now();

console.log("Executing JS!");

init();
animate();

function getCurrentChunk(providedPos?: THREE.Vector3) {
  const pos = providedPos || getPosition();
  return pos.divideScalar(chunkSize).floor();
}

function generateChunkAtPosition(pos?: THREE.Vector3) {
  const { x, y, z } = getCurrentChunk(pos).multiplyScalar(chunkSize);
  const spatialIndex = new THREE.Vector3(x, y, z);
  const { mesh, line, chunk } = generateChunk(x, z, y);
  console.log("Generated chunk at: ", spatialIndex);
  chunks.set(spatialIndex, chunk);
  scene.add(mesh);
  lines.push(line);
  objects.push(mesh);
  return chunk;
}

function getCameraDirection() {
  const pos = new THREE.Vector3();
  camera.getWorldDirection(pos);
  return pos;
}

function generateChunksAroundCamera() {
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const pos = getCurrentChunk();
      const offset = new THREE.Vector3(x, y, -1);
      const spatialIndex = pos.add(offset).multiplyScalar(chunkSize);
      if (!chunks.get(spatialIndex)) {
        console.log("Generating new chunk");
        console.log("At: ", spatialIndex);

        const chunk = generateChunkAtPosition();
        chunks.set(spatialIndex, chunk);
      }
    }
  }
  rendering = false;
}

function generateChunkBeforeCamera() {
  const newPosition = getCameraDirection()
    .multiplyScalar(chunkSize * 2)
    .add(controls.getObject().position);
  generateChunkAtPosition(newPosition);
}

function getPosition() {
  const { x, y, z } = controls.getObject().position;
  const pos = new THREE.Vector3(x, y, z);
  return pos;
}

function init() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    20000
  );
  camera.position.y = worldHeight;
  object.position.set(0, 0, -chunkSize);
  camera.add(object);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  const ambientLight = new THREE.AmbientLight(0xcccccc);
  ambientLight.intensity = 0.5;
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
  scene.add(directionalLight);

  // addLights(scene);

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

  const onKeyPress = (event) => {
    if (event.repeat) {
      console.log("Pressed F but repeated");
      return;
    }
    switch (event.code) {
      case "KeyF":
        console.log("Pressed F");
        generateChunksAroundCamera();
        // lines.forEach((line) => {
        //   line.visible = wireframesView % 2 === 0;
        // });
        // objects.forEach((mesh) => {
        //   mesh.visible = wireframesView % 2 === 1;
        // });
        // wireframesView++;
        break;
    }
  };
  document.removeEventListener("keypress", onKeyPress);
  document.addEventListener("keypress", onKeyPress);
  addListeners();

  scene.add(controls.getObject());
  lastChunk = getCurrentChunk();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  // let time = performance.now();
  if (controls.isLocked === true) {
    direction.z = Number(moveForward) - Number(moveBack);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.y = Number(moveDown) - Number(moveUp);
    direction.normalize();

    velocity.z = -direction.z * maxSpeed;
    velocity.x = -direction.x * maxSpeed;
    velocity.y = -direction.y * maxSpeed;

    controls.moveRight(-velocity.x);
    controls.moveForward(-velocity.z);
    controls.getObject().position.y += velocity.y;
    if (!getCurrentChunk().equals(lastChunk)) {
      console.log("Moved to a new chunk!");
      generateChunksAroundCamera();
    }
  }
  // prevTime = time;
  lastChunk = getCurrentChunk();

  renderer.render(scene, camera);
}
