import "./main.css";
import { Inventory } from "./inventory";
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

const { air } = blocks;
const blocker = document.getElementById("blocker");
const crosshairs = document.getElementById("crosshairContainer");
const instructions = document.getElementById("instructions");

let camera: PerspectiveCamera;
let scene: Scene;
let inventory: Inventory;
let canvas: HTMLCanvasElement;
let player: Player;
let renderer: WebGLRenderer;
let renderRequested = false;
let menu = true;
let globalChunks: Record<string, Chunk> = {};
let chunkHelperVisibility = false;
let lastChunkId = "0,0,0";
let queue = [];

init();

function handleMouseClick(event: MouseEvent) {
  if (menu) return;
  const mouseClick = new MouseClickEvent(event);
  const intersection = getIntersection(mouseClick, camera, globalChunks);
  const block = mouseClick.right ? inventory.selectFromActiveHotbarSlot() : air;
  if (intersection) {
    const pos = convertIntersectionToPosition(intersection, block);
    if (mouseClick.right && (!isOutOfPlayer(pos, player) || block === air))
      return;

    placeVoxel(block, globalChunks, pos).then((chunkUpdates) => {
      mergeChunkUpdates(globalChunks, chunkUpdates);
      updateSurroundingChunkGeometry(pos);
      requestRenderIfNotRequested();
    });
  }
}

export async function updateGeometry(chunkId: string, defaultLight = false) {
  const pos = computeSmallChunkCornerFromId(chunkId);

  if (!globalChunks[chunkId]) return;

  let mesh = globalChunks[chunkId].mesh;

  const geometry = mesh ? mesh.geometry : new BufferGeometry();

  await chunkWorkerPool.queue(async (worker) => {
    const { positions, normals, uvs, indices, lightValues } =
      await worker.generateGeometry(
        pickSurroundingChunks(globalChunks, chunkId),
        chunkId,
        defaultLight
      );

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

    geometry.setAttribute(
      "light",
      new BufferAttribute(new Float32Array(lightValues), 1)
    );
    geometry.setAttribute(
      "color",
      new BufferAttribute(
        new Float32Array(
          positions.map(() => {
            return 255;
          })
        ),
        3
      )
    );
  });

  if (!mesh) {
    mesh = new Mesh(geometry, opaque);
    mesh.name = "chunk:" + chunkId;
    globalChunks[chunkId].mesh = mesh;
    scene.add(mesh);
    mesh.position.set(...pos);

    const chunkOutline = new LineSegments(
      new EdgesGeometry(new BoxGeometry(chunkSize, chunkSize, chunkSize)),
      new LineBasicMaterial({ color: 0x00ff00 })
    );
    chunkOutline.name = "debug:" + chunkId;
    chunkOutline.visible = chunkHelperVisibility;
    globalChunks[chunkId].debugMesh = chunkOutline;
    scene.add(chunkOutline);
    chunkOutline.position.set(
      pos[0] + chunkSize / 2,
      pos[1] + chunkSize / 2,
      pos[2] + chunkSize / 2
    );
  }
}

async function generate(chunksToSpawn: string[]) {
  const promises = [];
  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      if (globalChunks[chunkIdForSpawning]?.isGenerated) {
        console.log("Chunk already exists");
        continue;
      }
      surroundingOffsets.forEach((offset) => {
        const offVec = new Vector3(...offset);
        if (!globalChunks[addOffsetToChunkId(newChunkId, offVec)]) {
          globalChunks[addOffsetToChunkId(newChunkId, offVec)] =
            makeEmptyChunk();
        }
      });

      const streamInChunksPromise = streamInChunk(
        globalChunks,
        chunkIdForSpawning
      ).then((chunks) => {
        globalChunks = chunks;
      });
      promises.push(streamInChunksPromise);
    }
  }

  await Promise.all(promises);

  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

      await chunkWorkerPool.queue(async (worker) => {
        const updatedChunksWithTrees = await worker.growTrees(
          pickSurroundingChunks(globalChunks, chunkIdForSpawning),
          chunkIdForSpawning
        );
        mergeChunkUpdates(globalChunks, updatedChunksWithTrees);
      });
    }
  }

  const sunlightPromises = [];
  for (let newChunkId of chunksToSpawn) {
    const { updatedChunks, stillNeedUpdates } = await sunlightChunks(
      getSurroundingChunksColumns(globalChunks, newChunkId),
      [newChunkId]
    );
    mergeChunkUpdates(globalChunks, updatedChunks);
    // Object.keys(stillNeedUpdates).forEach((chunkId) => {
    //   sunlightPromises.push(
    //     chunkWorkerPool.queue(async (worker) => {
    //       const { updatedChunks } = await worker.floodLight(
    //         pickSurroundingChunks(globalChunks, chunkId),
    //         stillNeedUpdates[chunkId]
    //       );
    //       mergeChunkUpdates(globalChunks, updatedChunks);
    //     })
    //   );
    // });
  }

  await Promise.all(sunlightPromises);

  const updateGeometryPromises = [];
  for (let newChunkId of chunksToSpawn) {
    // globalChunks = await sunlightChunks(globalChunks, [newChunkId]);
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

      // const pos = computeSmallChunkCornerFromId(chunkIdForSpawning);
      // updateGeometryPromises.push(updateSurroundingChunkGeometry(pos));
      updateGeometryPromises.push(updateGeometry(chunkIdForSpawning));
    }
  }
  await Promise.all(updateGeometryPromises);

  return chunksToSpawn;
}

function shouldChunksUpdate() {
  const newChunkId = computeChunkColumnId(player.position.toArray());
  if (lastChunkId !== newChunkId) {
    lastChunkId = newChunkId;
    handleChunks(newChunkId);
  }
}

export function pruneChunks(playerPosition: Vector3) {
  Object.keys(globalChunks)
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
      delete globalChunks[idToDelete];
      const object = scene.getObjectByName("chunk:" + idToDelete) as Mesh;
      object?.geometry?.dispose();
      (object?.material as Material)?.dispose();
      object && scene.remove(object);
      renderer.renderLists.dispose();
    });
}

async function handleChunks(newChunkId: string) {
  if (queue.length > 0) {
    return;
  }

  const chunksToSpawn = await figureOutChunksToSpawn(
    globalChunks,
    queue,
    newChunkId
  );
  queue.push(...chunksToSpawn);
  const chunksSpawned = await generate(chunksToSpawn);

  queue = queue.filter((id) => !chunksSpawned.includes(id));
  pruneChunks(player.position);
}

async function init() {
  const near = 0.01;
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    near,
    viewDistance * chunkSize
  );
  camera.position.y = terrainHeight + 5;
  // console.log("initial position", camera.position.y);
  canvas = document.querySelector("#canvas");
  renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.physicallyCorrectLights = true;

  scene = new Scene();
  global.scene = scene;
  global.Mesh = Mesh;
  global.globalChunks = globalChunks;

  const loop = new Loop(camera, scene, renderer);
  player = new Player(
    new PointerLockControls(camera, document.body),
    globalChunks
  );
  inventory = new Inventory();
  const logTime = new SimpleTimer();
  handleChunks(lastChunkId).then(() => logTime.takenFor("Init"));
  loop.register(player);
  loop.register({ tick: shouldChunksUpdate });
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
      case "KeyZ":
        console.log("Pressed Z");
        chunkHelperVisibility = !chunkHelperVisibility;

        Object.keys(globalChunks).forEach((chunkId) => {
          globalChunks[chunkId].debugMesh.visible = chunkHelperVisibility;
        });
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
      case "KeyK":
        console.log(
          "Height Value here",
          getHeightValue(player.position.x, player.position.z)
        );
        break;
    }
  };
  document.addEventListener("keypress", onKeyPress);
  window.addEventListener("click", handleMouseClick);

  scene.add(player.controls.getObject());
  const color = "lightblue";
  scene.fog = new Fog(
    color,
    viewDistance * chunkSize - 2 * chunkSize,
    viewDistance * chunkSize
  );
  scene.background = new Color(color);

  window.addEventListener("resize", onWindowResize);
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
