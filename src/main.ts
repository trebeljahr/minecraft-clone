import "./main.css";

import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { addLights } from "./lights";
import { blockLength, worldHeight } from "./constants";
import {
  chunkSize,
  shouldPlaceBlock,
  generateChunk,
  halfChunk,
} from "./createChunk";
import {
  addListeners,
  moveBack,
  moveDown,
  moveForward,
  moveLeft,
  moveRight,
  moveUp,
} from "./controls";
import { World } from "./VoxelWorld";

let camera, controls, lastChunk, scene, renderer, canvas;
let world: World;
let renderRequested = false;

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
const crosshairs = document.getElementById("crosshair-container");
const instructions = document.getElementById("instructions");
const object = new THREE.Object3D();
let prevTime = performance.now();
let menu = true;
const neighborOffsets = [
  [0, 0, 0], // self
  [-1, 0, 0], // left
  [1, 0, 0], // right
  [0, -1, 0], // down
  [0, 1, 0], // up
  [0, 0, -1], // back
  [0, 0, 1], // front
];

const chunkIdToMesh = {};
const texture = new THREE.TextureLoader().load(require("../assets/stone.png"));

texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;

const material = new THREE.MeshLambertMaterial({
  map: texture,
  side: THREE.DoubleSide,
  alphaTest: 0.1,
  transparent: true,
});

console.log("Executing JS!");

init();
animate();

function getCurrentChunk(providedPos?: THREE.Vector3) {
  const pos = providedPos || getPosition();
  return pos.divideScalar(chunkSize).floor();
}

function requestRenderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(render);
  }
}

function generateChunkAtPosition(pos: THREE.Vector3) {
  for (let y = 0; y < chunkSize; ++y) {
    for (let z = 0; z < chunkSize; ++z) {
      for (let x = 0; x < chunkSize; ++x) {
        if (shouldPlaceBlock(pos.x + x, pos.y + y, pos.z + z) && z < 30) {
          world.setVoxel(pos.x + x, pos.y + y, pos.z + z, 1);
        }
      }
    }
  }
  console.log({ pos });
  updateVoxelGeometry(pos.x, pos.y, pos.z);
}

function generateChunksAroundCamera() {
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const offset = new THREE.Vector3(x, y, -1).multiplyScalar(chunkSize);
      generateChunkAtPosition(copy(getPosition()).add(offset));
    }
  }
}

function placeVoxel(event) {
  if ((event.button !== 0 && event.button !== 2) || menu) return;

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const x = (pos.x / window.innerWidth) * 2 - 1;
  const y = (pos.y / window.innerHeight) * -2 + 1; // note we flip Y

  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  start.setFromMatrixPosition(camera.matrixWorld);
  end.set(x, y, 1).unproject(camera);

  const intersection = world.intersectRay(start, end);
  if (intersection) {
    const voxelId = event.button === 0 ? 0 : 1;
    const pos = intersection.position.map((v, ndx) => {
      return v + intersection.normal[ndx] * (voxelId > 0 ? 0.5 : -0.5);
    }) as [number, number, number];
    world.setVoxel(...pos, voxelId);
    updateVoxelGeometry(...pos);
    requestRenderIfNotRequested();
  }
}

function updateVoxelGeometry(x: number, y: number, z: number) {
  const updatedChunkIds = {};
  for (const offset of neighborOffsets) {
    const ox = x + offset[0];
    const oy = y + offset[1];
    const oz = z + offset[2];
    console.log(ox, oy, oz);
    const chunkId = world.computeChunkId(ox, oy, oz);
    console.log({ chunkId });
    if (!updatedChunkIds[chunkId]) {
      console.log("Updating Chunk Geometry");
      updatedChunkIds[chunkId] = true;
      updateChunkGeometry(ox, oy, oz);
    }
  }
}

function updateChunkGeometry(x: number, y: number, z: number) {
  const chunkX = Math.floor(x / chunkSize);
  const chunkY = Math.floor(y / chunkSize);
  const chunkZ = Math.floor(z / chunkSize);
  const chunkId = world.computeChunkId(x, y, z);
  let mesh = chunkIdToMesh[chunkId];
  const geometry = mesh ? mesh.geometry : new THREE.BufferGeometry();

  const {
    positions,
    normals,
    uvs,
    indices,
  } = world.generateGeometryDataForChunk(chunkX, chunkY, chunkZ);
  const positionNumComponents = 3;
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array(positions),
      positionNumComponents
    )
  );
  const normalNumComponents = 3;
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
  );
  const uvNumComponents = 2;
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents)
  );
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  if (!mesh) {
    mesh = new THREE.Mesh(geometry, material);
    mesh.name = chunkId;
    chunkIdToMesh[chunkId] = mesh;
    scene.add(mesh);
    mesh.position.set(
      chunkX * chunkSize,
      chunkY * chunkSize,
      chunkZ * chunkSize
    );
  }
}

function copy(vec: THREE.Vector3) {
  return new THREE.Vector3().copy(vec);
}

function getPosition() {
  const { x, y, z } = controls.getObject().position;
  const pos = new THREE.Vector3(x, y, z);
  return pos;
}

function init() {
  const tileSize = 16;
  const tileTextureWidth = 16;
  const tileTextureHeight = 16;
  world = new World({
    chunkSize,
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
  });

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
  canvas = document.querySelector("#canvas");
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  controls = new PointerLockControls(camera, document.body);

  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    menu = false;
    instructions.style.display = "none";
    blocker.style.display = "none";
    crosshairs.style.display = "flex";
  });

  controls.addEventListener("unlock", function () {
    menu = true;
    blocker.style.display = "block";
    instructions.style.display = "";
    crosshairs.style.display = "none";
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
  window.addEventListener("click", placeVoxel);
  addListeners();

  scene.add(controls.getObject());
  lastChunk = getCurrentChunk();

  window.addEventListener("resize", onWindowResize);

  generateChunkAtPosition(new THREE.Vector3(0, 0, 1));
  generateChunkAtPosition(new THREE.Vector3(0, 0, 17));
  generateChunkAtPosition(new THREE.Vector3(0, 0, 33));

  console.log("Testing chunkId: ", world.computeChunkId(16, 17, -33));
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
  renderRequested = false;

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
    // if (!getCurrentChunk().equals(lastChunk)) {
    //   console.log("Moved to a new chunk!");
    // generateChunksAroundCamera();
    // }
  }
  // prevTime = time;
  // lastChunk = getCurrentChunk();

  renderer.render(scene, camera);
}
