import "./main.css";
import { Inventory } from "./inventory";
import { blocks } from "./blocks";
import { MouseClickEvent } from "./helpers";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import {
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
} from "./constants";
import { World } from "./VoxelWorld";
import { Loop } from "./Loop";
import { Player } from "./Player";

import {
  ACESFilmicToneMapping,
  Color,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
} from "three";

const blocker = document.getElementById("blocker");
const crosshairs = document.getElementById("crosshairContainer");
const instructions = document.getElementById("instructions");
// const loopSize = 3;
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
// let minX = -loopSize;
// let maxX = loopSize;
// let x = minX;
// let minY = -loopSize;
// let maxY = loopSize;
// let y = minY;

init();

async function generateChunkAtPosition(pos: Vector3) {
  const start = Date.now();
  world.generateChunkData(pos);
  console.log("Time for chunk geometry creation:", Date.now() - start);
}

async function sunlightChunkAtPos(pos: Vector3) {
  const start = Date.now();
  await world.sunLightChunkColumnAt(pos.toArray());
  const afterSunlighting = Date.now();
  console.log("Time for sunlight propagation:", afterSunlighting - start);
  world.updateChunkGeometry(pos.toArray());
  world.updateChunkGeometry(
    copy(pos)
      .setY(pos.y + chunkSize)
      .toArray()
  );

  requestRenderIfNotRequested();
  console.log("Time for geometry updates:", Date.now() - afterSunlighting);
}

async function generateChunksAroundCamera() {
  const start = Date.now();
  const initialWorldRadius = 3;
  let count = 0;
  for (let x = -initialWorldRadius; x <= initialWorldRadius; x++) {
    for (let y = -initialWorldRadius; y <= initialWorldRadius; y++) {
      for (let z = 0; z >= -1; z--) {
        count++;
        const offset = new Vector3(x, z, y).multiplyScalar(chunkSize);
        const newPos = player.position.add(offset);
        generateChunkAtPosition(newPos);
      }
    }
  }

  for (let x = -initialWorldRadius; x <= initialWorldRadius; x++) {
    for (let y = -initialWorldRadius; y <= initialWorldRadius; y++) {
      for (let z = 0; z >= -1; z--) {
        const offset = new Vector3(x, z, y).multiplyScalar(chunkSize);
        const newPos = player.position.add(offset);
        await sunlightChunkAtPos(newPos);
      }
    }
  }

  console.log("Number of chunks generated around camera: ", count);
  console.log(
    "Total time for generating and lighting chunks: ",
    Date.now() - start
  );
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

    const distanceFromPlayerHead = new Vector3(...pos).sub(player.pos).length();
    const distanceFromPlayerFeet = new Vector3(...pos)
      .sub(copy(player.pos).setY(player.pos.y - 1))
      .length();
    if (
      (distanceFromPlayerHead < 1 || distanceFromPlayerFeet < 1) &&
      voxelId !== 0
    ) {
      console.log("Trying to create block within player!");
      return;
    }
    console.log("Setting voxel at ", pos);
    console.log("Voxel at mouse click", world.getVoxel(pos));
    world.setVoxel(pos, voxelId);
    const emanatingLight = glowingBlocks.includes(voxelId) ? 15 : 0;
    const neighborLight = neighborOffsets.reduce((maxLight, offset) => {
      const neighborPos = pos.map(
        (coord, i) => coord + offset.toArray()[i]
      ) as Position;
      const { light } = world.getVoxel(neighborPos);
      return light > maxLight ? light : maxLight;
    }, 0);
    const lightValue = Math.max(emanatingLight, neighborLight - 1);
    world.setLightValue(pos, lightValue);

    await world.floodLight([pos]);
    const chunksToUpdateSet = new Set<string>();
    surroundingOffsets.forEach((dir) => {
      const positionWithChunkOffset = pos.map(
        (coord, i) => coord + dir[i] * (chunkSize - 2)
      ) as Position;

      const chunkIndex = world.computeChunkIndex(positionWithChunkOffset);
      chunksToUpdateSet.add(chunkIndex);
    });
    chunksToUpdateSet.forEach((chunkId) => {
      const chunkCoordinates = chunkId
        .split(",")
        .map((coord) => parseInt(coord) * chunkSize) as Position;
      world.updateChunkGeometry(chunkCoordinates);
    });
    requestRenderIfNotRequested();
  }
}

async function init() {
  const start = Date.now();
  console.log("Init has been called");
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
      case "KeyF":
        console.log("Pressed F");
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
  document.addEventListener("keypress", onKeyPress);
  window.addEventListener("click", placeVoxel);

  scene.add(player.controls.getObject());

  window.addEventListener("resize", onWindowResize);
  await generateChunksAroundCamera();
  // spawnSingleBlock();
  console.log("Total time for init function", Date.now() - start);
}

function pruneChunks() {
  if (renderer.info.render.frame % 5 !== 0) return;
  // Object.keys(world.chunks).forEach((chunkId) => {
  //   console.log(chunkId);
  //   const distance = world.computeChunkDistanceFromPoint(
  //     player.position.toArray(),
  //     chunkId
  //   );
  for (let x = -3; x <= 3; x++) {
    for (let y = -3; y <= 3; y++) {
      for (let z = 0; z >= -1; z--) {
        const offset = new Vector3(x, z, y).multiplyScalar(chunkSize);
        const newPos = player.position.add(offset);
        const chunkId = world.computeChunkIndex(newPos.toArray());
        if (!world.chunks[chunkId]) {
          // generateChunkAtPosition(newPos);
          // sunlightChunkAtPos(newPos);
          console.log("Generating missing chunk");
        }
      }
    }
  }

  // if (distance > 4) {
  //   console.log("Deleting chunk out of range with chunkId: ", chunkId);
  //   const object = scene.getObjectByName(chunkId) as Mesh;
  //   object?.geometry?.dispose();
  //   (object?.material as Material)?.dispose();
  //   object && scene.remove(object);
  //   renderer.renderLists.dispose();
  //   delete world.chunks[chunkId];
  //   requestRenderIfNotRequested();
  // }
  // });
  console.log(Object.keys(world.chunks).length);
  console.log(Object.keys(world.chunks));
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  renderRequested = false;
  // generateTerrain();
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
// const [x, y, z] = player.pos.toArray();
// const initialBlockPos = [x, y - 2, z - 3] as Position;
// const hardcodedCameraDirection = {
//   x: -0.5757005393263303,
//   y: -0.6186039666723383,
//   z: -0.5346943252332317,
// };
// const hardcodedCameraPosition = {
//   x: 2.2839938822872243,
//   y: 85,
//   z: -0.8391258104030554,
// };
// camera.position.y = hardcodedCameraPosition.y;
// camera.position.x = hardcodedCameraPosition.x;
// camera.position.z = hardcodedCameraPosition.z;
// const camDirection = new Vector3(...initialBlockPos);
// camDirection.y -= 0.5;
// camera.lookAt(camDirection);
// world.setVoxel(initialBlockPos, blocks.coal);
// world.sunLightChunkAt(initialBlockPos, () => {
//   world.updateChunkGeometry(initialBlockPos);
//   world.updateChunkGeometry(
//     copy(player.pos)
//       .setY(player.pos.y + chunkSize)
//       .toArray()
//   );
//   requestRenderIfNotRequested();
// });
// }

// function generateTerrain() {
//   if (maxX > 5) return;

//   if (renderer.info.render.frame % 5 === 0) {
//     const pos = new Vector3(x * chunkSize, surface - chunkSize, y * chunkSize);

//     generateChunkAtPosition(pos);
//     generateChunkAtPosition(copy(pos).sub(new Vector3(0, 1 * chunkSize, 0)));
//     generateChunkAtPosition(copy(pos).sub(new Vector3(0, 2 * chunkSize, 0)));

//     if (y === maxY && x === maxX - 1) {
//       console.log("Finished loop");
//       minX--;
//       maxX++;
//       x = minX;
//       minY--;
//       maxY++;
//       y = minY;
//     } else {
//       if (y === maxY && x > minX && x < maxX) {
//         x++;
//       }
//       if (y === maxY && x === maxX) {
//         x = minX + 1;
//       }
//       if (y >= minY && y < maxY && x === maxX) {
//         y++;
//       }

//       if (x > minX && x < maxX && y === minY) {
//         x++;
//       }

//       if (x === minX) {
//         if (y === maxY) {
//           x++;
//           y = minY;
//         } else {
//           y++;
//         }
//       }
//     }
//   }
// }
