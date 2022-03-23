import { Material, Mesh, Renderer, Scene, Vector3, WebGLRenderer } from "three";
import { generateChunkData } from "./chunkLogic/generateData";
import {
  Chunks,
  chunkSize,
  Position,
  verticalNumberOfChunks,
} from "./constants";
import {
  addChunkAtChunkId,
  computeChunkId,
  getChunkCoordinatesFromId,
  SimpleTimer,
} from "./helpers";
import { chunkWorkerPool } from "./workers/workerPool";
import { ChunkWorkerObject } from "./workers/chunkWorkerObject";
import { updateGeometry } from "./chunkLogic/updateGeometry";

export function pruneChunks(
  globalChunks: Chunks,
  playerPosition: Vector3,
  meshes: Record<string, Mesh>,
  scene: Scene,
  renderer: WebGLRenderer
) {
  Object.keys(globalChunks)
    .filter((id) => {
      const currentChunkId = computeChunkId(playerPosition.toArray());
      const [x, , z] = getChunkCoordinatesFromId(id);
      const [x2, , z2] = getChunkCoordinatesFromId(currentChunkId);
      const outOfView =
        Math.abs(x - x2) >= viewDistance || Math.abs(z - z2) >= viewDistance;
      return outOfView;
    })
    .forEach((idToDelete) => {
      delete meshes[idToDelete];
      delete globalChunks[idToDelete];
      const object = scene.getObjectByName(idToDelete) as Mesh;
      object?.geometry?.dispose();
      (object?.material as Material)?.dispose();
      object && scene.remove(object);
      renderer.renderLists.dispose();
    });

  Object.keys(globalChunks).forEach((id) => {
    if (!globalChunks[id] && scene.getObjectByName(id)) {
      console.log("We have a scene chunk without world chunk");
    }
  });
}

export async function sunlightChunks(globalChunks: Chunks) {
  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;
    const res = await chunkWorker.createSunlightQueue(globalChunks);
    const { chunks, sunlightQueue } = res;
    globalChunks = chunks;
    globalChunks = await chunkWorker.floodLight(chunks, sunlightQueue);
  });

  return globalChunks;
}

const viewDistance = 3;

function queueChunks(
  globalChunks: Chunks,
  chunksQueuedForGeneration: string[],
  playerPos: Vector3
) {
  const iterator = viewDistance - 1;

  for (let y = verticalNumberOfChunks; y >= 0; y--) {
    for (let z = -iterator; z <= iterator; z++) {
      for (let x = -iterator; x <= iterator; x++) {
        const chunkPos = new Vector3(
          playerPos.x + x * chunkSize,
          y * chunkSize, // y position of player doesn't matter!
          playerPos.z + z * chunkSize
        );

        const chunkId = computeChunkId(chunkPos.toArray());
        const chunkAlreadyQueued = chunksQueuedForGeneration.includes(chunkId);

        if (chunkAlreadyQueued || globalChunks[chunkId]?.isGenerated) {
          // continue NOT return!!!
          continue;
        }
      }
    }
  }
}

export async function streamInChunks(globalChunks: Chunks, chunkId: string) {
  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;

    globalChunks = await chunkWorker.addChunkAtChunkId(globalChunks, chunkId);
    globalChunks[chunkId] = await chunkWorker.generateChunkData(
      globalChunks[chunkId],
      chunkId
    );
  });
  return globalChunks;
}
