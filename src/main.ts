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
  handleChunks,
  mergeChunkUpdates,
  pickSurroundingChunks,
  shouldChunksUpdate,
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
import { setupControls } from "./controls";
import { onWindowResize, requestRenderIfNotRequested } from "./rendering";
import { player } from "./Player";

init();

async function init() {
  const loop = new Loop(world.renderer);

  const logTime = new SimpleTimer();
  handleChunks().then(() => logTime.takenFor("Init"));
  loop.register(player);
  loop.register({ tick: shouldChunksUpdate });
  loop.start();
  setupControls();
  const color = "lightblue";
  world.scene.fog = new Fog(
    color,
    viewDistance * chunkSize - 2 * chunkSize,
    viewDistance * chunkSize
  );
  world.scene.background = new Color(color);

  window.addEventListener("resize", onWindowResize);
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
