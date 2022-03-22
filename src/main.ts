import "./main.css";
import { Inventory } from "./inventory";
import { blocks, blocksLookup } from "./blocks";
import {
  MouseClickEvent,
  SimpleTimer,
  computeChunkId,
  getVoxel,
  computeChunkDistanceFromPoint,
  parseChunkId,
  getChunkCoordinatesFromId,
  computeSmallChunkCornerFromId,
  transformToBlocks,
  computeChunkOffsetVector,
} from "./helpers";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import {
  verticalNumberOfChunks,
  copy,
  terrainHeight,
  tileSize,
  tileTextureWidth,
  tileTextureHeight,
  chunkSize,
  neighborOffsets,
  glowingBlocks,
  surroundingOffsets,
  Position,
  fields,
  Chunks,
  maxHeight,
} from "./constants";
import { World } from "./VoxelWorld";
import { Loop } from "./Loop";
import { Player } from "./Player";

import {
  ACESFilmicToneMapping,
  Color,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
} from "three";
import { floodLightWorkerPool, sunlightWorkerPool } from "./workers/workerPool";

const blocker = document.getElementById("blocker");
const crosshairs = document.getElementById("crosshairContainer");
const instructions = document.getElementById("instructions");
const { air } = blocks;

let camera: PerspectiveCamera;
let scene: Scene;
let inventory: Inventory;
let canvas: HTMLCanvasElement;
let world: World;
let player: Player;
let renderer: WebGLRenderer;
let renderRequested = false;
let menu = true;

init();

async function sunlightChunkAtPos(pos: Vector3) {
  let sunlitChunks: Chunks, floodLightQueue: Position[];
  const logTime = new SimpleTimer();
  // const filteredChunks = getSurroundingChunksColumns(
  //   world.chunks,
  //   pos.toArray()
  // );
  // console.log("Filtered around:", computeChunkId(pos.toArray()));
  // console.log("ChunkIds", Object.keys(filteredChunks));

  await sunlightWorkerPool.queue(async (worker) => {
    ({ sunlitChunks, floodLightQueue } = await worker.sunlightChunkColumnAt(
      pos.toArray(),
      world.chunks
    ));
  });
  logTime.takenFor("sunlight");

  await floodLightWorkerPool.queue(async (worker) => {
    const chunkUpdates = await worker.floodLight(sunlitChunks, floodLightQueue);
    // console.log("Original: ", world.chunks);
    // console.log("Update: ", chunkUpdates);
    world.chunks = { ...world.chunks, ...chunkUpdates };
  });
  logTime.takenFor("floodlight");

  for (let y = 0; y < maxHeight + 20; y += chunkSize) {
    await world.updateChunkGeometry(computeChunkId([pos.x, y, pos.z]));
  }

  requestRenderIfNotRequested();
}

let chunksQueuedForGeneration: string[] = [];
const viewDistance = 3;

async function generateChunkAtPosition(newId: string) {
  await world.addChunkAtId(newId);
  await world.generateChunkData(newId);
  await world.updateChunkGeometry(newId, true);
  requestRenderIfNotRequested();
}

function streamInChunks() {
  // const iterator = viewDistance - 1;
  const iterator = 1;
  for (let y = verticalNumberOfChunks; y >= 0; y--) {
    for (let z = -iterator; z <= iterator; z++) {
      for (let x = -iterator; x <= iterator; x++) {
        const chunkPos = new Vector3(
          player.position.x + x * chunkSize,
          y * chunkSize, // y position of player doesn't matter!
          player.position.z + z * chunkSize
        );

        const chunkId = computeChunkId(chunkPos.toArray());
        const chunkAlreadyQueued = chunksQueuedForGeneration.includes(chunkId);
        const chunkExistsAlready = world.chunks[chunkId];

        if (chunkAlreadyQueued || chunkExistsAlready) {
          // continue NOT return!!!
          continue;
        }
        chunksQueuedForGeneration.push(chunkId);

        generateChunkAtPosition(chunkId).then(() => {
          chunksQueuedForGeneration = chunksQueuedForGeneration.filter((id) => {
            return id !== chunkId;
          });
          if (
            y === 0
            // z < iterator &&
            // z > -iterator &&
            // x < iterator &&
            // x > -iterator
          ) {
            // console.log("Hello making sun");
            // const posOfChunkToSunlight = parseChunkId(chunkId);
            // sunlightChunkAtPos(posOfChunkToSunlight);
          }
        });
      }
    }
  }
}

function pruneChunks() {
  if (renderer.info.render.frame % 120 !== 0) return;

  Object.keys(world.chunks).forEach((idToDelete) => {
    const currentChunkId = computeChunkId(player.position.toArray());
    const [x, , z] = getChunkCoordinatesFromId(idToDelete);
    const [x2, , z2] = getChunkCoordinatesFromId(currentChunkId);
    const outOfView =
      Math.abs(x - x2) >= viewDistance || Math.abs(z - z2) >= viewDistance;
    if (outOfView && !chunksQueuedForGeneration.includes(idToDelete)) {
      const object = scene.getObjectByName(idToDelete) as Mesh;
      object?.geometry?.dispose();
      (object?.material as Material)?.dispose();
      object && scene.remove(object);
      renderer.renderLists.dispose();
      delete world.meshes[idToDelete];
      delete world.chunks[idToDelete];
      requestRenderIfNotRequested();
    }
  });
}

async function placeVoxel(event: MouseEvent) {
  const mouseClick = new MouseClickEvent(event);
  if (!(mouseClick.right || mouseClick.left) || menu === true) return;
  const selectedBlock = inventory.selectFromActiveHotbarSlot();
  if (selectedBlock === air && mouseClick.right) {
    console.log("Skipping because trying to place air block");
    return;
  }

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const x = (pos.x / window.innerWidth) * 2 - 1;
  const y = (pos.y / window.innerHeight) * -2 + 1;

  const start = new Vector3();
  const end = new Vector3();
  start.setFromMatrixPosition(camera.matrixWorld);
  end.set(x, y, 1).unproject(camera);

  const intersection = world.intersectRay(start, end);
  if (intersection) {
    const voxelId = event.button === 0 ? 0 : selectedBlock;
    const pos = intersection.position
      .map((v, ndx) => {
        return v + intersection.normal[ndx] * (voxelId > 0 ? 0.5 : -0.5);
      })
      .map((coord) => Math.floor(coord)) as Position;

    const distanceFromPlayerHead = new Vector3(...pos)
      .sub(player.position)
      .length();
    const distanceFromPlayerFeet = new Vector3(...pos)
      .sub(player.position)
      .setY(player.position.y - 1)
      .length();
    if (
      (distanceFromPlayerHead < 1 || distanceFromPlayerFeet < 1) &&
      voxelId !== 0
    ) {
      console.log("Trying to create block within player!");
      return;
    }
    console.log("Setting voxel at ", pos);
    console.log("Voxel at mouse click", getVoxel(world.chunks, pos));
    world.setVoxel(pos, voxelId);
    const emanatingLight = glowingBlocks.includes(voxelId) ? 15 : 0;
    const neighborLight = neighborOffsets.reduce((maxLight, offset) => {
      const neighborPos = pos.map(
        (coord, i) => coord + offset.toArray()[i]
      ) as Position;
      const { light } = getVoxel(world.chunks, neighborPos);
      return light > maxLight ? light : maxLight;
    }, 0);
    const lightValue = Math.max(emanatingLight, neighborLight - 1);
    world.setLightValue(pos, lightValue);
    // await floodLightWorkerPool.queue(async (worker) => {
    //   const chunksUpdates = await worker.floodLight(world.chunks, [pos]);
    //   world.chunks = { ...world.chunks, ...chunksUpdates };
    // });

    const chunksToUpdateSet = new Set<string>();
    surroundingOffsets.forEach((dir) => {
      const positionWithChunkOffset = pos.map(
        (coord, i) => coord + dir[i] * (chunkSize - 2)
      ) as Position;

      const chunkIndex = computeChunkId(positionWithChunkOffset);
      chunksToUpdateSet.add(chunkIndex);
    });
    chunksToUpdateSet.forEach((chunkId) => {
      const chunkCoordinates = chunkId
        .split(",")
        .map((coord) => parseInt(coord) * chunkSize) as Position;
      world.updateChunkGeometry(chunkId);
    });
    requestRenderIfNotRequested();
  }
}

async function init() {
  const logTime = new SimpleTimer();
  const near = 0.01;
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    near,
    20000
  );
  camera.position.y = terrainHeight + 5;
  console.log("initial position", camera.position.y);
  canvas = document.querySelector("#canvas");
  renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.physicallyCorrectLights = true;

  scene = new Scene();
  // scene.background = new Color(0xbfd1e5);
  scene.background = new Color("white");

  world = new World({
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
    scene,
  });

  const loop = new Loop(camera, scene, renderer);
  player = new Player(new PointerLockControls(camera, document.body), world);
  inventory = new Inventory();
  loop.register(player);
  loop.register({ tick: streamInChunks });
  loop.register({ tick: pruneChunks });
  loop.start();

  blocker.addEventListener("click", function () {
    player.controls.lock();
  });

  player.controls.addEventListener("lock", function () {
    menu = false;
    instructions.style.display = "none";
    blocker.style.display = "none";
    if (!inventory.isOpen) {
      crosshairs.style.display = "flex";
      inventory.hotbarElement.style.display = "flex";
    }
  });

  player.controls.addEventListener("unlock", function () {
    menu = true;
    if (!inventory.isOpen) {
      blocker.style.display = "flex";
      instructions.style.display = "block";
      inventory.hotbarElement.style.display = "none";
    }
    crosshairs.style.display = "none";
  });

  const onKeyPress = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }
    switch (event.code) {
      case "KeyE":
        if (!player.controls.isLocked && !inventory.isOpen) return;
        inventory.toggle();
        inventory.isOpen ? player.controls.unlock() : player.controls.lock();
        break;
      case "KeyH":
        console.log(
          "Player Position: ",
          player.position.toArray().map((elem) => Math.floor(elem))
        );
        break;
      case "KeyF":
        const pos = player.controls.getObject().position;
        const newPos = new Vector3(0, terrainHeight + 5, 0);
        pos.y = newPos.y;
        pos.x = newPos.x;
        pos.z = newPos.z;

        break;
      case "KeyK":
        console.log("Camera Debug");
        const camDirection = new Vector3(0, 0, 0);
        camera.getWorldDirection(camDirection);

        console.log("direction", camDirection);
        console.log("position:", camera.position);
        break;
      case "KeyG":
        console.log("Pressed G", player.position);
        console.log(
          "X is stuck",
          player.position.x - Math.floor(player.position.x) <= 0.001
        );
        console.log(
          "Z is stuck",
          player.position.z - Math.floor(player.position.z) <= 0.001
        );
        break;
    }
  };
  document.addEventListener("keypress", onKeyPress);
  window.addEventListener("click", placeVoxel);

  scene.add(player.controls.getObject());

  window.addEventListener("resize", onWindowResize);
  // await generateChunksAroundCamera();
  // spawnSingleBlock();
  logTime.takenFor("Init function");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  renderRequested = false;
  // pruneChunks();
  renderer.render(scene, camera);
}

function requestRenderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(render);
  }
}

// function spawnSingleBlock() {
//   const [x, y, z] = player.pos.toArray();
//   const initialBlockPos = [x, y - 2, z - 3] as Position;
//   const hardcodedCameraPosition = {
//     x: 2.2839938822872243,
//     y: 85,
//     z: -0.8391258104030554,
//   };
//   camera.position.y = hardcodedCameraPosition.y;
//   camera.position.x = hardcodedCameraPosition.x;
//   camera.position.z = hardcodedCameraPosition.z;
//   const camDirection = new Vector3(...initialBlockPos);
//   camDirection.y -= 0.5;
//   camera.lookAt(camDirection);
//   world.setVoxel(initialBlockPos, blocks.coal);
// }
