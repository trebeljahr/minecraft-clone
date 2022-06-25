import "./main.css";
import { blocks } from "./blocks";
import {
  MouseClickEvent,
  SimpleTimer,
  computeChunkId,
  getVoxel,
  getChunkCoordinatesFromId,
  setLightValue,
  addOffsetToChunkId,
  computeChunkColumnId,
  computeSmallChunkCornerFromId,
  makeEmptyChunk,
  getSurroundingChunksColumns,
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
  viewDistance,
  Chunks,
} from "./constants";
import { Loop } from "./Loop";
import { Player } from "./Player";

import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Fog,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
} from "three";
import { intersectRay } from "./intersectRay";
import { getHeightValue, setVoxel } from "./chunkLogic";
import {
  mergeChunkUpdates,
  pickSurroundingChunks,
  streamInChunk,
  sunlightChunks,
  updateSurroundingChunkGeometry,
} from "./streamChunks";
import { figureOutChunksToSpawn } from "./chunkLogic/figureOutChunksToSpawn";
import { chunkWorkerPool } from "./workers/workerPool";
import { opaque } from "./voxelMaterial";
import {
  convertIntersectionToPosition,
  getIntersection as getIntersection,
  placeVoxel,
  isOutOfPlayer,
} from "./placeVoxel";
import { generate } from "./generateChunks";
import { world } from "./world";

const { air } = blocks;
const blocker = document.getElementById("blocker");
const crosshairs = document.getElementById("crosshairContainer");
const instructions = document.getElementById("instructions");

let canvas: HTMLCanvasElement;
let renderer: WebGLRenderer;
let renderRequested: boolean;
let lastChunkId = "0,0,0";
let chunkLoadingQueue: string[] = [];

init();

function handleMouseClick(event: MouseEvent) {
  if (world.menu) return;
  const mouseClick = new MouseClickEvent(event);
  const intersection = getIntersection(
    mouseClick,
    world.camera,
    world.globalChunks
  );
  const block = mouseClick.right
    ? world.inventory.selectFromActiveHotbarSlot()
    : air;
  if (intersection) {
    const pos = convertIntersectionToPosition(intersection, block);
    if (
      mouseClick.right &&
      (!isOutOfPlayer(pos, world.player) || block === air)
    )
      return;

    placeVoxel(block, world.globalChunks, pos).then((chunkUpdates) => {
      mergeChunkUpdates(world.globalChunks, chunkUpdates);
      updateSurroundingChunkGeometry(pos);
      requestRenderIfNotRequested();
    });
  }
}

function shouldChunksUpdate() {
  const newChunkId = computeChunkColumnId(world.player.position.toArray());
  if (lastChunkId !== newChunkId) {
    lastChunkId = newChunkId;
    handleChunks(newChunkId);
  }
}

export function pruneChunks(playerPosition: Vector3) {
  Object.keys(world.globalChunks)
    .filter((id) => {
      const currentChunkId = computeChunkId(playerPosition.toArray());
      const [x, , z] = getChunkCoordinatesFromId(id);
      const [x2, , z2] = getChunkCoordinatesFromId(currentChunkId);
      const outOfView =
        Math.abs(x - x2) > viewDistance + 1 ||
        Math.abs(z - z2) > viewDistance + 1;
      return outOfView;
    })
    .forEach((idToDelete) => {
      delete world.meshes[idToDelete];
      delete world.debugMeshes[idToDelete];
      delete world.globalChunks[idToDelete];
      const object = world.scene.getObjectByName("chunk:" + idToDelete) as Mesh;
      object?.geometry?.dispose();
      (object?.material as Material)?.dispose();
      object && world.scene.remove(object);
      renderer.renderLists.dispose();
    });
}

async function handleChunks(newChunkId: string) {
  if (chunkLoadingQueue.length > 0) {
    return;
  }

  const chunksToSpawn = await figureOutChunksToSpawn(
    world.globalChunks,
    chunkLoadingQueue,
    newChunkId
  );
  chunkLoadingQueue.push(...chunksToSpawn);
  const chunksSpawned = await generate(world.globalChunks, chunksToSpawn);

  chunkLoadingQueue = chunkLoadingQueue.filter(
    (id) => !chunksSpawned.includes(id)
  );
  pruneChunks(world.player.position);
}

async function init() {
  canvas = document.querySelector("#canvas");
  renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.physicallyCorrectLights = true;

  const loop = new Loop(renderer);

  const logTime = new SimpleTimer();
  handleChunks(lastChunkId).then(() => logTime.takenFor("Init"));
  loop.register(world.player);
  loop.register({ tick: shouldChunksUpdate });
  loop.start();

  blocker.addEventListener("click", function () {
    world.player.controls.lock();
  });

  world.player.controls.addEventListener("lock", function () {
    world.menu = false;
    instructions.style.display = "none";
    blocker.style.display = "none";
    if (!world.inventory.isOpen) {
      crosshairs.style.display = "flex";
      world.inventory.hotbarElement.style.display = "flex";
    }
  });

  world.player.controls.addEventListener("unlock", function () {
    world.menu = true;
    if (!world.inventory.isOpen) {
      blocker.style.display = "flex";
      instructions.style.display = "block";
      world.inventory.hotbarElement.style.display = "none";
    }
    crosshairs.style.display = "none";
  });

  const onKeyPress = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }
    switch (event.code) {
      case "KeyE":
        if (!world.player.controls.isLocked && !world.inventory.isOpen) return;
        world.inventory.toggle();
        world.inventory.isOpen
          ? world.player.controls.unlock()
          : world.player.controls.lock();
        break;
      case "KeyH":
        console.log(
          "world.Player Position: ",
          world.player.position.toArray().map((elem) => Math.floor(elem))
        );
        break;
      case "KeyF":
        const pos = world.player.controls.getObject().position;
        const newPos = new Vector3(0, terrainHeight + 5, 0);
        pos.y = newPos.y;
        pos.x = newPos.x;
        pos.z = newPos.z;

        break;
      case "KeyZ":
        console.log("Pressed Z");
        world.chunkHelperVisibility = !world.chunkHelperVisibility;

        Object.keys(world.debugMeshes).forEach((chunkId) => {
          world.debugMeshes[chunkId].visible = world.chunkHelperVisibility;
        });
        break;
      case "KeyK":
        console.log("Camera Debug");
        const camDirection = new Vector3(0, 0, 0);
        world.camera.getWorldDirection(camDirection);

        console.log("direction", camDirection);
        console.log("position:", world.camera.position);
        break;
      case "KeyG":
        console.log("Pressed G", world.player.position);
        console.log(
          "X is stuck",
          world.player.position.x - Math.floor(world.player.position.x) <= 0.001
        );
        console.log(
          "Z is stuck",
          world.player.position.z - Math.floor(world.player.position.z) <= 0.001
        );
        break;
      case "KeyK":
        console.log(
          "Height Value here",
          getHeightValue(world.player.position.x, world.player.position.z)
        );
        break;
    }
  };
  document.addEventListener("keypress", onKeyPress);
  window.addEventListener("click", handleMouseClick);

  world.scene.add(world.player.controls.getObject());
  const color = "lightblue";
  world.scene.fog = new Fog(
    color,
    viewDistance * chunkSize - 2 * chunkSize,
    viewDistance * chunkSize
  );
  world.scene.background = new Color(color);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  world.camera.aspect = window.innerWidth / window.innerHeight;
  world.camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  renderRequested = false;
  renderer.render(world.scene, world.camera);
}

function requestRenderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(render);
  }
}

// function spawnSingleBlock() {
//   const [x, y, z] = world.player.pos.toArray();
//   const initialBlockPos = [x, y - 2, z - 3] as Position;
//   const hardcodedCameraPosition = {
//     x: 2.2839938822872243,
//     y: 85,
//     z: -0.8391258104030554,
//   };
//   world.camera.position.y = hardcodedCameraPosition.y;
//   world.camera.position.x = hardcodedCameraPosition.x;
//   world.camera.position.z = hardcodedCameraPosition.z;
//   const camDirection = new Vector3(...initialBlockPos);
//   camDirection.y -= 0.5;
//   world.camera.lookAt(camDirection);
//   setVoxel(initialBlockPos, blocks.coal);
// }
