import "./main.css";

import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { addLights } from "./lights";
import { blockLength, copy, surface, terrainHeight } from "./constants";
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

let camera, lastChunk, scene, canvas;
let world: World;
let renderer: THREE.WebGLRenderer;
let renderRequested = false;
let controls: PointerLockControls;
let wireframesView = 2;
let rendering = false;
const chunks = new Map<THREE.Vector3, Uint8Array>();
const chunksToRender = 3;
const chunksToRenderDown = 2;
const objects = [];
const lines = [];
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const maxSpeed = 0.5;
const blocker = document.getElementById("blocker");
const crosshairs = document.getElementById("crosshair-container");
const instructions = document.getElementById("instructions");
const player = new THREE.BoxGeometry(0.5, 1.8, 0.5);
const object = new THREE.Object3D();
let prevTime = performance.now();
let menu = true;
const neighborOffsets = [
  new THREE.Vector3(0, 0, 0), // self
  new THREE.Vector3(-1, 0, 0), // left
  new THREE.Vector3(1, 0, 0), // right
  new THREE.Vector3(0, -1, 0), // down
  new THREE.Vector3(0, 1, 0), // up
  new THREE.Vector3(0, 0, -1), // back
  new THREE.Vector3(0, 0, 1), // front
];

const loopSize = 3;
let minX = -loopSize;
let maxX = loopSize;
let x = minX;

let minY = -loopSize;
let maxY = loopSize;
let y = minY;

const chunkIdToMesh = {};
const texture = new THREE.TextureLoader().load(
  require("../assets/flourish-atlas.png")
);

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
  return copy(pos).divideScalar(chunkSize).floor();
}

function generateChunkAtPosition(pos: THREE.Vector3) {
  pos.divideScalar(chunkSize).floor().multiplyScalar(chunkSize);
  for (let y = 0; y < chunkSize; ++y) {
    if (pos.y + y > terrainHeight || pos.y + y <= 0) {
      continue;
    }
    for (let z = 0; z < chunkSize; ++z) {
      for (let x = 0; x < chunkSize; ++x) {
        if (shouldPlaceBlock(pos.x + x, pos.y + y, pos.z + z)) {
          world.setVoxel(pos.x + x, pos.y + y, pos.z + z, 1);
        }
      }
    }
  }
  updateVoxelGeometry(pos.x, pos.y, pos.z);
  requestRenderIfNotRequested();
}

function cameraDirection() {
  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const x = (pos.x / window.innerWidth) * 2 - 1;
  const y = (pos.y / window.innerHeight) * -2 + 1; // note we flip Y
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  start.setFromMatrixPosition(camera.matrixWorld);
  end.set(x, y, 1).unproject(camera);
  const direction = new THREE.Vector3().copy(end).sub(start).normalize();
  return direction;
}

function generateChunksAroundCamera() {
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      for (let z = -3; z < 0; z++) {
        const offset = new THREE.Vector3(x, z, y).multiplyScalar(chunkSize);
        const newPos = copy(getPosition()).add(offset);
        generateChunkAtPosition(newPos);
      }
    }
  }
}

function generateChunksInMovementDirection() {
  const dir = getCurrentChunk().sub(lastChunk);
  console.log("Direction", dir);

  var axis = new THREE.Vector3(0, 1, 0);
  var angle = Math.PI / 2;

  const rotatedOffset = copy(dir)
    .applyAxisAngle(axis, angle)
    .multiplyScalar(chunkSize);

  const offset = dir
    .multiplyScalar(chunkSize)
    .add(new THREE.Vector3(0, -chunkSize, 0));
  const newPos = copy(getPosition()).add(offset);
  generateChunkAtPosition(newPos);
  generateChunkAtPosition(copy(newPos).add(rotatedOffset));
  generateChunkAtPosition(copy(newPos).sub(rotatedOffset));
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
    const ox = x + offset.x;
    const oy = y + offset.y;
    const oz = z + offset.z;
    const chunkId = world.computeChunkId(ox, oy, oz);
    if (!updatedChunkIds[chunkId]) {
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

function getPosition() {
  const { x, y, z } = controls.getObject().position;
  const pos = new THREE.Vector3(x, y, z);
  return pos;
}

function init() {
  const tileSize = 16;
  const tileTextureWidth = 256;
  const tileTextureHeight = 64;
  world = new World({
    chunkSize,
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
  });

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    20000
  );
  camera.position.y = terrainHeight;
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

  blocker.addEventListener("click", function () {
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
    blocker.style.display = "flex";
    instructions.style.display = "";
    crosshairs.style.display = "none";
  });

  const onKeyPress = (event) => {
    if (event.repeat) {
      return;
    }
    switch (event.code) {
      case "KeyF":
        console.log("Pressed F");
        // generateChunksAroundCamera();
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

  generateChunksAroundCamera();

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

function requestRenderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(render);
  }
}

function wouldCollideWithTerrain({ x, y, z }: THREE.Vector3) {
  const collision = world.getVoxel(x, y, z);
  if (collision !== 0) return true;
  return false;
}

function generateTerrain() {
  if (maxX > 5) return;

  if (renderer.info.render.frame % 5 === 0) {
    const pos = new THREE.Vector3(
      x * chunkSize,
      surface - chunkSize,
      y * chunkSize
    );

    generateChunkAtPosition(pos);
    generateChunkAtPosition(
      copy(pos).sub(new THREE.Vector3(0, 1 * chunkSize, 0))
    );
    generateChunkAtPosition(
      copy(pos).sub(new THREE.Vector3(0, 2 * chunkSize, 0))
    );

    if (y === maxY && x === maxX - 1) {
      console.log("Finished loop");
      minX--;
      maxX++;
      x = minX;
      minY--;
      maxY++;
      y = minY;
    } else {
      if (y === maxY && x > minX && x < maxX) {
        x++;
      }
      if (y === maxY && x === maxX) {
        x = minX + 1;
      }
      if (y >= minY && y < maxY && x === maxX) {
        y++;
      }

      if (x > minX && x < maxX && y === minY) {
        x++;
      }

      if (x === minX) {
        if (y === maxY) {
          x++;
          y = minY;
        } else {
          y++;
        }
      }
    }
  }
}

function render() {
  renderRequested = false;
  generateTerrain();

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
    if (wouldCollideWithTerrain(copy(controls.getObject().position))) {
      console.log("Would collide in X dir");
      controls.moveRight(+velocity.x);
    }

    controls.getObject().position.y += velocity.y;
    if (wouldCollideWithTerrain(copy(controls.getObject().position))) {
      console.log("Would collide in Y dir");
      controls.getObject().position.y -= velocity.y;
    }

    controls.moveForward(-velocity.z);
    if (wouldCollideWithTerrain(copy(controls.getObject().position))) {
      console.log("Would collide in Z dir");
      controls.moveRight(+velocity.z);
    }

    if (!getCurrentChunk().equals(lastChunk)) {
      console.log("Moved to a new chunk!");
      // generateChunksInMovementDirection();
      // generateChunksAroundCamera();
    }
  }
  // prevTime = time;
  lastChunk = getCurrentChunk();

  renderer.render(scene, camera);
}
