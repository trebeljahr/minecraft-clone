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
  addOffsetToChunkId,
  computeChunkColumnId,
  computeSmallChunkCornerFromId,
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
} from "./constants";
import { Loop } from "./Loop";
import { Player } from "./Player";

import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Color,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
} from "three";
import { intersectRay } from "./intersectRay";
import { setVoxel } from "./chunkLogic";
import { streamInChunk, sunlightChunks } from "./streamChunks";
import { figureOutChunksToSpawn } from "./chunkLogic/figureOutChunksToSpawn";
import { chunkWorkerPool } from "./workers/workerPool";
import { opaque } from "./voxelMaterial";

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
let lastChunkId = "0,0,0";
let queue = [];
let counter = 0;

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
      updateGeometry(chunkId);
    });
    requestRenderIfNotRequested();
  }
}

export async function updateGeometry(chunkId: string, defaultLight = false) {
  const chunkOffset = computeSmallChunkCornerFromId(chunkId);

  if (!globalChunks[chunkId]) return;

  let mesh = meshes[chunkId];

  const geometry = mesh ? mesh.geometry : new BufferGeometry();

  await chunkWorkerPool.queue(async (worker) => {
    const { positions, normals, uvs, indices, lightValues } =
      await worker.generateGeometry(globalChunks, chunkId, defaultLight);

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
    meshes[chunkId] = mesh;
    scene.add(mesh);
    mesh.position.set(chunkOffset[0], chunkOffset[1], chunkOffset[2]);
  }
}

async function generate(chunksToSpawn: string[]) {
  // const logTime = new SimpleTimer();
  const promises = [];
  // console.log("Now trying to spawn:", chunksToSpawn.length);
  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      if (globalChunks[chunkIdForSpawning]?.isGenerated) {
        console.log("Chunk already exists");
        continue;
      }
      const streamInChunksPromise = streamInChunk(
        globalChunks,
        chunkIdForSpawning
      ).then((chunks) => {
        globalChunks = chunks;

        return updateGeometry(chunkIdForSpawning, true);
      });
      promises.push(streamInChunksPromise);
    }
  }

  // logTime.takenFor("Queuing up all chunk generation promises");
  await Promise.all(promises);
  console.log("Done chunk generation ", counter);

  globalChunks = await sunlightChunks(globalChunks, chunksToSpawn);
  console.log("Done sunlighting", counter);

  const updateGeometryPromises = [];
  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      updateGeometryPromises.push(updateGeometry(chunkIdForSpawning));
    }
  }
  await Promise.all(updateGeometryPromises);
  console.log("Done geometry ", counter);

  return chunksToSpawn;
}

function shouldChunksUpdate() {
  const newChunkId = computeChunkColumnId(player.position.toArray());
  if (lastChunkId !== newChunkId) {
    lastChunkId = newChunkId;
    // console.log("Switching chunks!");
    handleChunks(newChunkId);
  }
}

export function pruneChunks(playerPosition: Vector3) {
  // console.log("Before pruning:", Object.keys(globalChunks).length);
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
      // console.log(idToDelete);
      delete meshes[idToDelete];
      delete globalChunks[idToDelete];
      const object = scene.getObjectByName("chunk:" + idToDelete) as Mesh;
      object?.geometry?.dispose();
      (object?.material as Material)?.dispose();
      object && scene.remove(object);
      renderer.renderLists.dispose();
    });

  const chunks = scene.children.filter(
    (thing) =>
      thing.name.startsWith("chunk:") &&
      Object.keys(globalChunks).includes(thing.name.split(":")[1])
  );
  scene.children = [camera, ...chunks];
  console.log("Done pruning ", counter);
  // console.log("After pruning: ", Object.keys(globalChunks).length);
}
async function handleChunks(newChunkId: string) {
  if (queue.length > 0) {
    return;
  }
  counter++;

  console.log("Start handlin chunk streaming", counter);
  const chunksToSpawn = await figureOutChunksToSpawn(
    globalChunks,
    queue,
    newChunkId
  );
  queue.push(...chunksToSpawn);
  console.log("Done chunks to spawn ", counter);
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
  global.scene = scene;
  global.Mesh = Mesh;
  global.globalChunks = globalChunks;
  // scene.background = new Color(0xbfd1e5);
  scene.background = new Color("white");

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
