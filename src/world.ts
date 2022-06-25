import {
  LineSegments,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import {
  Chunk,
  Chunks,
  chunkSize,
  terrainHeight,
  viewDistance,
} from "./constants";
import { Inventory } from "./inventory";
import { Player } from "./Player";

interface World {
  meshes: Record<string, Mesh>;
  debugMeshes: Record<string, LineSegments>;
  camera: PerspectiveCamera;
  scene: Scene;
  inventory: Inventory;
  player: Player;
  menu: boolean;
  globalChunks: Chunks;
  chunkHelperVisibility: boolean;
}

const camera = createCamera();
const globalChunks: Chunks = {};

export let world: World = {
  meshes: {},
  debugMeshes: {},
  camera,
  menu: true,
  chunkHelperVisibility: true,
  scene: new Scene(),
  player: new Player(
    new PointerLockControls(camera, document.body),
    globalChunks
  ),
  globalChunks,
  inventory: new Inventory(),
};

function createCamera() {
  const near = 0.01;
  const camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    near,
    viewDistance * chunkSize
  );
  camera.position.y = terrainHeight + 5;
  return camera;
}

global.world = world;
