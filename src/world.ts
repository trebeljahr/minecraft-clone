import {
  ACESFilmicToneMapping,
  type LineSegments,
  type Mesh,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
} from "three";
import { type Chunks, chunkSize, terrainHeight, viewDistance } from "./constants";
import { Inventory } from "./inventory";

interface World {
  meshes: Record<string, Mesh>;
  debugMeshes: Record<string, LineSegments>;
  camera: PerspectiveCamera;
  scene: Scene;
  initialLoadDone: boolean;
  inventory: Inventory;
  menu: boolean;
  globalChunks: Chunks;
  changedChunks: Chunks;
  stepFloodLightCalc: () => void;
  chunkHelperVisibility: boolean;
  renderer: WebGLRenderer;
  renderRequested: boolean;
  lastChunkId: string;
}

const camera = createCamera();
const globalChunks: Chunks = {};
const changedChunks: Chunks = {};

export const world: World = {
  meshes: {},
  initialLoadDone: false,
  debugMeshes: {},
  renderer: createRenderer(),
  renderRequested: false,
  lastChunkId: "0,0,0",
  camera,
  menu: true,
  chunkHelperVisibility: false,
  stepFloodLightCalc: () => {},
  scene: new Scene(),
  globalChunks,
  changedChunks,
  inventory: new Inventory(),
};

function createRenderer() {
  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  const renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  return renderer;
}

function createCamera() {
  const near = 0.01;
  const camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    near,
    viewDistance * chunkSize,
  );
  camera.position.y = terrainHeight + 5;
  return camera;
}

(globalThis as unknown as { world: World }).world = world;
