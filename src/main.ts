import "./main.css";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import {
  birchwood,
  cactus,
  copy,
  dirt,
  foliage,
  gold,
  grass,
  neighborOffsets,
  oakwood,
  stone,
  surface,
  terrainHeight,
  tileSize,
  tileTextureWidth,
  tileTextureHeight,
} from "./constants";
import { chunkSize, shouldPlaceBlock } from "./createChunk";
import { World } from "./VoxelWorld";
import { Loop } from "./Loop";
import { Player } from "./Player";
import { initSky } from "./sky";

import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";

let camera: PerspectiveCamera;
let scene: Scene;
let canvas: HTMLCanvasElement;
let world: World;
let player: Player;
let renderer: WebGLRenderer;
let renderRequested = false;
const blocker = document.getElementById("blocker");
const crosshairs = document.getElementById("crosshair-container");
const instructions = document.getElementById("instructions");
let menu = true;

const loopSize = 3;
let minX = -loopSize;
let maxX = loopSize;
let x = minX;
let minY = -loopSize;
let maxY = loopSize;
let y = minY;
let lastChunk;

const chunkIdToMesh = {};
const texture = new TextureLoader().load(
  require("../assets/First-Texture-Atlas.png")
);

texture.magFilter = NearestFilter;
texture.minFilter = NearestFilter;

const material = new MeshStandardMaterial({ map: texture, alphaTest: 0.2 });

init();

// function cameraDirection() {
//   const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
//   const x = (pos.x / window.innerWidth) * 2 - 1;
//   const y = (pos.y / window.innerHeight) * -2 + 1; // note we flip Y
//   const start = new Vector3();
//   const end = new Vector3();
//   start.setFromMatrixPosition(camera.matrixWorld);
//   end.set(x, y, 1).unproject(camera);
//   const direction = new Vector3().copy(end).sub(start).normalize();
//   return direction;
// }

function getCurrentChunk(providedPos?: Vector3) {
  const pos = providedPos || player.position;
  return copy(pos).divideScalar(chunkSize).floor();
}

// function generateChunksInMovementDirection() {
//   const currentChunk = getCurrentChunk();
//   if (lastChunk === currentChunk) return;
//   lastChunk = currentChunk;
//   const dir = currentChunk.sub(lastChunk);

//   var axis = new Vector3(0, 1, 0);
//   var angle = Math.PI / 2;

//   const rotatedOffset = copy(dir)
//     .applyAxisAngle(axis, angle)
//     .multiplyScalar(chunkSize);

//   const offset = dir
//     .multiplyScalar(chunkSize)
//     .add(new Vector3(0, -chunkSize, 0));
//   const newPos = player.position.add(offset);
//   generateChunkAtPosition(newPos);
//   generateChunkAtPosition(copy(newPos).add(rotatedOffset));
//   generateChunkAtPosition(copy(newPos).sub(rotatedOffset));
// }

function wouldPlaceBlockAbove(x: number, currentY: number, z: number) {
  for (let y = currentY + 1; y < currentY + 5; y++) {
    if (shouldPlaceBlock(x, y, z)) {
      return true;
    }
  }
  return false;
}

function shouldSpawnGrass(x: number, y: number, z: number) {
  return !wouldPlaceBlockAbove(x, y, z);
}

function shouldSpawnGold(x: number, currentY: number, z: number) {
  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   world.getVoxel()
  // }
  return Math.random() < 0.01;
}

function shouldSpawnDirt(x: number, currentY: number, z: number) {
  for (let y = currentY + 1; y < currentY + 4; y++) {
    if (shouldSpawnGrass(x, y, z)) {
      return true;
    }
  }
  return false;
}

function shouldSpawnTree() {
  return Math.random() < 0.006;
}

function spawnTree(currentX: number, currentY: number, currentZ: number) {
  const treeHeight = currentY + Math.floor(Math.random() * 3) + 3;
  const leafHeightMin = treeHeight - 2;
  const leafHeightMax = treeHeight + 2;

  const wood = Math.random() > 0.5 ? oakwood : birchwood;

  const leafWidth = 2;

  for (let y = currentY; y < leafHeightMax; y++) {
    if (y >= leafHeightMin && y < treeHeight) {
      for (let x = currentX - leafWidth; x <= currentX + leafWidth; x++) {
        for (let z = currentZ - leafWidth; z <= currentZ + leafWidth; z++) {
          world.setVoxel(x, y, z, foliage);
        }
      }
    } else if (y >= leafHeightMin && y <= treeHeight) {
      for (let x = currentX - 1; x <= currentX + 1; x++) {
        for (let z = currentZ - 1; z <= currentZ + 1; z++) {
          world.setVoxel(x, y, z, foliage);
        }
      }
    } else if (y >= leafHeightMin) {
      world.setVoxel(currentX, y, currentZ, foliage);
      world.setVoxel(currentX, y, currentZ + 1, foliage);
      world.setVoxel(currentX, y, currentZ - 1, foliage);
      world.setVoxel(currentX + 1, y, currentZ, foliage);
      world.setVoxel(currentX - 1, y, currentZ, foliage);
    }
    if (y <= treeHeight) {
      world.setVoxel(currentX, y, currentZ, wood);
    }
  }

  updateVoxelGeometry(currentX, leafHeightMax, currentZ);
  updateVoxelGeometry(currentX - leafWidth, leafHeightMax, currentZ);
  updateVoxelGeometry(currentX + leafWidth, leafHeightMax, currentZ);
  updateVoxelGeometry(currentX, leafHeightMax, currentZ - leafWidth);
  updateVoxelGeometry(currentX, leafHeightMax, currentZ + leafWidth);
}

function generateChunkAtPosition(pos: Vector3) {
  pos.divideScalar(chunkSize).floor().multiplyScalar(chunkSize);
  for (let y = chunkSize - 1; y >= 0; --y) {
    if (pos.y + y > terrainHeight || pos.y + y <= 0) {
      continue;
    }
    for (let z = 0; z < chunkSize; ++z) {
      for (let x = 0; x < chunkSize; ++x) {
        if (shouldPlaceBlock(pos.x + x, pos.y + y, pos.z + z)) {
          if (shouldSpawnGold(pos.x + x, pos.y + y, pos.z + z)) {
            console.log("Spawning Gold");
            world.setVoxel(pos.x + x, pos.y + y, pos.z + z, gold);
          } else if (shouldSpawnGrass(pos.x + x, pos.y + y, pos.z + z)) {
            world.setVoxel(pos.x + x, pos.y + y, pos.z + z, grass);
            if (shouldSpawnTree()) {
              spawnTree(pos.x + x, pos.y + y + 1, pos.z + z);
            }
          } else if (shouldSpawnDirt(pos.x + x, pos.y + y, pos.z + z)) {
            world.setVoxel(pos.x + x, pos.y + y, pos.z + z, dirt);
          } else {
            world.setVoxel(pos.x + x, pos.y + y, pos.z + z, stone);
          }
        }
      }
    }
  }
  updateVoxelGeometry(pos.x, pos.y, pos.z);
  requestRenderIfNotRequested();
}

function generateChunksAroundCamera() {
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      for (let z = -3; z < 0; z++) {
        const offset = new Vector3(x, z, y).multiplyScalar(chunkSize);
        const newPos = player.position.add(offset);
        generateChunkAtPosition(newPos);
      }
    }
  }
}

function placeVoxel(event) {
  if ((event.button !== 0 && event.button !== 2) || menu) return;

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const x = (pos.x / window.innerWidth) * 2 - 1;
  const y = (pos.y / window.innerHeight) * -2 + 1; // note we flip Y

  const start = new Vector3();
  const end = new Vector3();
  start.setFromMatrixPosition(camera.matrixWorld);
  end.set(x, y, 1).unproject(camera);

  const intersection = world.intersectRay(start, end);
  if (intersection) {
    const voxelId = event.button === 0 ? 0 : cactus;
    const pos = intersection.position.map((v, ndx) => {
      return v + intersection.normal[ndx] * (voxelId > 0 ? 0.5 : -0.5);
    }) as [number, number, number];

    const distanceFromPlayerHead = new Vector3(...pos).sub(player.pos).length();
    const distanceFromPlayerFeet = new Vector3(...pos)
      .sub(copy(player.pos).setY(player.pos.y - 1))
      .length();
    if (
      (distanceFromPlayerHead < 1 || distanceFromPlayerFeet < 1) &&
      voxelId !== 0
    ) {
      console.log(distanceFromPlayerHead);
      console.log(distanceFromPlayerFeet);

      console.log("Trying to create block within player!");
      return;
    }
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
  const geometry = mesh ? mesh.geometry : new BufferGeometry();

  const {
    positions,
    normals,
    uvs,
    indices,
  } = world.generateGeometryDataForChunk(chunkX, chunkY, chunkZ);
  const positionNumComponents = 3;
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), positionNumComponents)
  );
  const normalNumComponents = 3;
  geometry.setAttribute(
    "normal",
    new BufferAttribute(new Float32Array(normals), normalNumComponents)
  );
  const uvNumComponents = 2;
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array(uvs), uvNumComponents)
  );
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  if (!mesh) {
    mesh = new Mesh(geometry, material);
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

function init() {
  world = new World({
    chunkSize,
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
  });
  const near = 0.01;
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    near,
    20000
  );
  camera.position.y = terrainHeight + 5;

  canvas = document.querySelector("#canvas");
  renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;

  scene = new Scene();
  scene.background = new Color(0xbfd1e5);

  const loop = new Loop(camera, scene, renderer);
  player = new Player(new PointerLockControls(camera, document.body), world);
  loop.register(player);
  // loop.register({
  //   tick: (_delta: number) => generateChunksInMovementDirection(),
  // });
  loop.start();

  blocker.addEventListener("click", function () {
    player.controls.lock();
  });

  player.controls.addEventListener("lock", function () {
    menu = false;
    instructions.style.display = "none";
    blocker.style.display = "none";
    crosshairs.style.display = "flex";
  });

  player.controls.addEventListener("unlock", function () {
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
        const pos = player.controls.getObject().position;
        const newPos = new Vector3(0, terrainHeight + 5, 0);
        pos.y = newPos.y;
        pos.x = newPos.x;
        pos.z = newPos.z;

        break;
      case "KeyG":
        console.log("Pressed G", player.pos);
        console.log(
          "X is stuck",
          player.pos.x - Math.floor(player.pos.x) <= 0.001
        );
        console.log(
          "Z is stuck",
          player.pos.z - Math.floor(player.pos.z) <= 0.001
        );
        break;
    }
  };

  document.removeEventListener("keypress", onKeyPress);
  document.addEventListener("keypress", onKeyPress);
  window.addEventListener("click", placeVoxel);

  scene.add(player.controls.getObject());

  window.addEventListener("resize", onWindowResize);
  generateChunksAroundCamera();
  initSky(camera, scene, renderer);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  renderRequested = false;
  generateTerrain();
  renderer.render(scene, camera);
}

function requestRenderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(render);
  }
}

function generateTerrain() {
  if (maxX > 5) return;

  if (renderer.info.render.frame % 5 === 0) {
    const pos = new Vector3(x * chunkSize, surface - chunkSize, y * chunkSize);

    generateChunkAtPosition(pos);
    generateChunkAtPosition(copy(pos).sub(new Vector3(0, 1 * chunkSize, 0)));
    generateChunkAtPosition(copy(pos).sub(new Vector3(0, 2 * chunkSize, 0)));

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
