import {
  ACESFilmicToneMapping,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
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

interface World {
  meshes: Record<string, Mesh>;
  debugMeshes: Record<string, LineSegments>;
  camera: PerspectiveCamera;
  scene: Scene;
  inventory: Inventory;
  menu: boolean;
  globalChunks: Chunks;
  chunkHelperVisibility: boolean;
  renderer: WebGLRenderer;
  renderRequested: boolean;
  lastChunkId: string;
}

const camera = createCamera();
const globalChunks: Chunks = {};

export let world: World = {
  meshes: {},
  debugMeshes: {},
  renderer: createRenderer(),
  renderRequested: false,
  lastChunkId: "0,0,0",
  camera,
  menu: true,
  chunkHelperVisibility: false,
  scene: new Scene(),
  globalChunks,
  inventory: new Inventory(),
};

function createRenderer() {
  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  const renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.physicallyCorrectLights = true;
  return renderer;
}

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
