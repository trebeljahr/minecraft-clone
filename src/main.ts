import "./main.css";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { copy, surface, terrainHeight } from "./constants";
import { chunkSize, shouldPlaceBlock } from "./createChunk";
import { World } from "./VoxelWorld";
import { Loop } from "./Loop";
import { Player } from "./Player";
import { initSky } from "./sky";

import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { Godrays } from "./godrays";

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

const neighborOffsets = [
  new Vector3(0, 0, 0), // self
  new Vector3(-1, 0, 0), // left
  new Vector3(1, 0, 0), // right
  new Vector3(0, -1, 0), // down
  new Vector3(0, 1, 0), // up
  new Vector3(0, 0, -1), // back
  new Vector3(0, 0, 1), // front
];

const loopSize = 3;
let minX = -loopSize;
let maxX = loopSize;
let x = minX;
let minY = -loopSize;
let maxY = loopSize;
let y = minY;

const chunkIdToMesh = {};
const texture = new TextureLoader().load(require("../assets/stone.png"));

texture.magFilter = NearestFilter;
texture.minFilter = NearestFilter;

const material = new MeshStandardMaterial({ map: texture });

init();

function generateChunkAtPosition(pos: Vector3) {
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
  const tileSize = 16;
  const tileTextureWidth = 16;
  const tileTextureHeight = 16;
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
  camera.position.y = terrainHeight;

  canvas = document.querySelector("#canvas");
  renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0xffffff);
  renderer.autoClear = false;

  scene = new Scene();
  scene.background = new Color(0xbfd1e5);

  // const godrays = new Godrays(renderer, camera, scene);
  const sky = initSky(camera, scene, renderer);
  const loop = new Loop(camera, scene, renderer);

  player = new Player(new PointerLockControls(camera, document.body), world);
  loop.register(player);
  // loop.register(godrays);
  loop.register(sky);
  // const ambientLight = new AmbientLight(0xcccccc);
  // ambientLight.intensity = 0.5;
  // scene.add(ambientLight);

  // const directionalLight = new DirectionalLight(0xffffff, 0.3);
  // scene.add(directionalLight);

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
        // camera.position.y = terrainHeight;
        const newPos = new Vector3(0, terrainHeight, 0);
        const pos = player.controls.getObject().position;
        pos.y = newPos.y;
        pos.x = newPos.x;
        pos.z = newPos.z;

        break;
    }
  };
  document.removeEventListener("keypress", onKeyPress);
  document.addEventListener("keypress", onKeyPress);
  window.addEventListener("click", placeVoxel);

  scene.add();

  window.addEventListener("resize", onWindowResize);
  generateChunksAroundCamera();

  loop.start();
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
