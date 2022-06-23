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
  getSmallChunkCorner,
  getChunkColumn,
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
  WireframeGeometry,
} from "three";
import { intersectRay } from "./intersectRay";
import { setVoxel } from "./chunkLogic";
import {
  mergeChunkUpdates,
  streamInChunk,
  sunlightChunks,
} from "./streamChunks";
import { figureOutChunksToSpawn } from "./chunkLogic/figureOutChunksToSpawn";
import { chunkWorkerPool } from "./workers/workerPool";
import { opaque } from "./voxelMaterial";
import { ChunkWorkerObject } from "./workers/chunkWorkerObject";

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
let debugMeshes: Record<string, LineSegments> = {};
let chunkHelperVisibility = false;
let lastChunkId = "0,0,0";
let queue = [];

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
    const ownLight = glowingBlocks.includes(voxelId) ? 15 : 0;
    const neighborLight = neighborOffsets.reduce((currentMax, offset) => {
      const neighborPos = pos.map(
        (coord, i) => coord + offset.toArray()[i]
      ) as Position;
      const { light } = getVoxel(globalChunks, neighborPos);
      return Math.max(light, currentMax);
    }, 0);
    const lightValue = Math.max(ownLight, neighborLight - 1);
    setLightValue(globalChunks, pos, lightValue);
    // await floodLightWorkerPool.queue(async (worker) => {
    //   const chunksUpdates = await worker.floodLight(chunks, [pos]);
    //   chunks = { ...chunks, ...chunksUpdates };
    // });

    updateSurroundingChunkGeometry(pos);
    requestRenderIfNotRequested();
  }
}

export function pickSurroundingChunks(globalChunks: Chunks, chunkId: string) {
  return neighborOffsets.reduce((output, offset) => {
    const newChunkId = addOffsetToChunkId(chunkId, offset);
    return { ...output, [newChunkId]: globalChunks[newChunkId] };
  }, {});
}

export async function updateGeometry(chunkId: string, defaultLight = false) {
  const pos = computeSmallChunkCornerFromId(chunkId);

  if (!globalChunks[chunkId]) return;

  let mesh = meshes[chunkId];

  const geometry = mesh ? mesh.geometry : new BufferGeometry();

  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;

    const { positions, normals, uvs, indices, lightValues } =
      await chunkWorker.generateGeometry(
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
    meshes[chunkId] = mesh;
    scene.add(mesh);
    mesh.position.set(...pos);

    const chunkOutline = new LineSegments(
      new EdgesGeometry(new BoxGeometry(chunkSize, chunkSize, chunkSize)),
      new LineBasicMaterial({ color: 0x00ff00 })
    );
    chunkOutline.name = "debug:" + chunkId;
    chunkOutline.visible = chunkHelperVisibility;
    debugMeshes[chunkId] = chunkOutline;
    scene.add(chunkOutline);
    chunkOutline.position.set(
      pos[0] + chunkSize / 2,
      pos[1] + chunkSize / 2,
      pos[2] + chunkSize / 2
    );
  }
}

async function updateSurroundingChunkGeometry(pos: Position) {
  const chunksToUpdateSet = new Set<string>();
  const chunkId = computeChunkId(pos);
  surroundingOffsets.forEach((dir) => {
    const neighbourChunkId = addOffsetToChunkId(chunkId, new Vector3(...dir));
    chunksToUpdateSet.add(neighbourChunkId);
  });
  const chunkUpdatePromises = [...chunksToUpdateSet].map((chunkId) =>
    updateGeometry(chunkId)
  );
  return Promise.all(chunkUpdatePromises);
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

  const sunlightPromises = [];
  for (let newChunkId of chunksToSpawn) {
    sunlightPromises.push(
      sunlightChunks(
        getChunkColumn(globalChunks, computeSmallChunkCornerFromId(newChunkId)),
        [newChunkId]
      ).then((sunlitChunks) => mergeChunkUpdates(globalChunks, sunlitChunks))
    );
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
      delete meshes[idToDelete];
      delete debugMeshes[idToDelete];
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
      case "KeyZ":
        console.log("Pressed Z");
        chunkHelperVisibility = !chunkHelperVisibility;

        Object.keys(debugMeshes).forEach((chunkId) => {
          debugMeshes[chunkId].visible = chunkHelperVisibility;
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
    }
  };
  document.addEventListener("keypress", onKeyPress);
  window.addEventListener("click", placeVoxel);

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
