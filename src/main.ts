import "./main.css";
import { Inventory } from "./inventory";
import { blocks } from "./blocks";
import {
  MouseClickEvent,
  SimpleTimer,
  computeChunkId,
  getVoxel,
  parseChunkId,
  getChunkCoordinatesFromId,
  addChunkAtChunkId,
  setLightValue,
} from "./helpers";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import {
  terrainHeight,
  chunkSize,
  neighborOffsets,
  glowingBlocks,
  surroundingOffsets,
  Position,
  Chunk,
  verticalNumberOfChunks,
} from "./constants";
import { Loop } from "./Loop";
import { Player } from "./Player";

import {
  ACESFilmicToneMapping,
  Color,
  Mesh,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
} from "three";
import { intersectRay } from "./intersectRay";
import { setVoxel } from "./chunkLogic";
import { updateGeometry } from "./chunkLogic/updateGeometry";
import { pruneChunks, streamInChunks, sunlightChunks } from "./streamChunks";

const blocker = document.getElementById("blocker");
const crosshairs = document.getElementById("crosshairContainer");
const instructions = document.getElementById("instructions");
const { air } = blocks;

let camera: PerspectiveCamera;
let scene: Scene;
let inventory: Inventory;
let canvas: HTMLCanvasElement;
let player: Player;
let renderer: WebGLRenderer;
let renderRequested = false;
let menu = true;
let globalChunks: Record<string, Chunk> = {};
let meshes: Record<string, Mesh> = {};

init();

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

  const intersection = intersectRay(globalChunks, start, end);
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
    console.log("Voxel at mouse click", getVoxel(globalChunks, pos));
    const chunkId = computeChunkId(pos);
    setVoxel(globalChunks[chunkId].data, pos, voxelId);
    const emanatingLight = glowingBlocks.includes(voxelId) ? 15 : 0;
    const neighborLight = neighborOffsets.reduce((maxLight, offset) => {
      const neighborPos = pos.map(
        (coord, i) => coord + offset.toArray()[i]
      ) as Position;
      const { light } = getVoxel(globalChunks, neighborPos);
      return light > maxLight ? light : maxLight;
    }, 0);
    const lightValue = Math.max(emanatingLight, neighborLight - 1);
    setLightValue(globalChunks, pos, lightValue);
    // await floodLightWorkerPool.queue(async (worker) => {
    //   const chunksUpdates = await worker.floodLight(chunks, [pos]);
    //   chunks = { ...chunks, ...chunksUpdates };
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
      updateGeometry(globalChunks, meshes, scene, chunkId);
    });
    requestRenderIfNotRequested();
  }
}
let lastChunkId = "0,0,0";
async function handleChunks() {
  const newChunkId = computeChunkId(player.position.toArray());
  if (lastChunkId !== newChunkId) {
    lastChunkId = newChunkId;
    console.log("Switching chunks!");
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const [x, , z] = getChunkCoordinatesFromId(newChunkId);
      const chunkIdForSpawning = `${x},${y},${z}`;
      globalChunks = await streamInChunks(globalChunks, chunkIdForSpawning);
      globalChunks = await sunlightChunks(globalChunks);
    }

    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const [x, , z] = getChunkCoordinatesFromId(newChunkId);
      const chunkIdForSpawning = `${x},${y},${z}`;
      await updateGeometry(
        globalChunks,
        meshes,
        scene,
        chunkIdForSpawning
        // true
      );
    }
    pruneChunks(globalChunks, player.position, meshes, scene, renderer);
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

  const loop = new Loop(camera, scene, renderer);
  player = new Player(
    new PointerLockControls(camera, document.body),
    globalChunks
  );
  inventory = new Inventory();
  loop.register(player);
  loop.register({ tick: handleChunks });
  // loop.register({ tick: pruneChunks });
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
//   setVoxel(initialBlockPos, blocks.coal);
// }
