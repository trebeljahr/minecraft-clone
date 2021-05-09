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

let camera, controls, scene, renderer;
let wireframesView = 2;

const chunksToRender = 3;
const objects = [];
const lines = [];
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const maxSpeed = 300;
const blocker = document.getElementById("blocker");
const instructions = document.getElementById("instructions");

let prevTime = performance.now();

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

  // for (let x = 0; x < chunksToRender; x++) {
  //   for (let y = 0; y < chunksToRender; y++) {
  //     for (let z = 0; z < worldHeight; z++) {
  //       const chunk = generateChunk(
  //         x * chunkSize,
  //         y * chunkSize,
  //         z * chunkSize
  //       );
  //       const geometries = [];
  //       chunk.forEach((block) => {
  //         if (block) {
  //           const blockMesh = new THREE.BoxGeometry(
  //             blockLength,
  //             blockLength,
  //             blockLength
  //           );
  //           blockMesh.translate(
  //             block.x * blockLength - halfChunk * blockLength,
  //             block.z * blockLength,
  //             block.y * blockLength - halfChunk * blockLength
  //           );
  //           geometries.push(blockMesh);
  //         }
  //       });
  //       if (geometries.length === 0) {
  //         geometries.push(
  //           new THREE.BoxGeometry(blockLength, blockLength, blockLength)
  //         );
  //       }
  //       const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
  //       geometry.computeBoundingSphere();

  //       const wireframe = new THREE.WireframeGeometry(geometry);
  //       const material = new THREE.LineBasicMaterial({ color: 0x4080ff });
  //       const line = new THREE.LineSegments(wireframe, material);
  //       line.computeLineDistances();
  //       line.visible = true;

  //       scene.add(line);

  //       // mesh = new THREE.Mesh(
  //       //   geometry,
  //       //   new THREE.MeshLambertMaterial({
  //       //     map: texture,
  //       //     side: THREE.DoubleSide,
  //       //   })
  //       // );

  //       // scene.add(mesh);
  //       // objects.push(mesh);
  //     }
  //   }
  // }

  // for (let x = 0; x < chunksToRender; x++) {
  //   for (let y = 0; y < chunksToRender; y++) {
  //     for (let z = 0; z < worldHeight; z++) {
  console.log("Chunk");
  const { mesh, line } = generateChunk(
    0, //x * chunkSize,
    0, //y * chunkSize,
    0 //z * chunkSize
  );

  scene.add(mesh);
  lines.push(line);
  objects.push(mesh);
  //     }
  //   }
  // }

  // const ambientLight = new THREE.AmbientLight(0xcccccc);
  // ambientLight.intensity = 0.8;
  // scene.add(ambientLight);

  // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  // scene.add(directionalLight);

  addLights(scene);

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
        lines.forEach((line) => {
          line.visible = wireframesView % 2 === 0;
        });
        objects.forEach((mesh) => {
          mesh.visible = wireframesView % 2 === 1;
        });
        wireframesView++;
        break;
    }
  };
  document.removeEventListener("keypress", onKeyPress);
  document.addEventListener("keypress", onKeyPress);
  addListeners();

  scene.add(controls.getObject());

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
