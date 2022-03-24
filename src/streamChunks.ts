import { Material, Mesh, Renderer, Scene, Vector3, WebGLRenderer } from "three";
import { generateChunkData } from "./chunkLogic/generateData";
import {
  Chunks,
  chunkSize,
  Position,
  verticalNumberOfChunks,
  viewDistance,
} from "./constants";
import {
  addChunkAtChunkId,
  computeChunkColumnId,
  computeChunkId,
  getChunkCoordinatesFromId,
  getChunkCoordinatesVector,
  getDistanceBetweenChunks,
  makeEmptyChunk,
  SimpleTimer,
} from "./helpers";
import { chunkWorkerPool } from "./workers/workerPool";
import { ChunkWorkerObject } from "./workers/chunkWorkerObject";

export async function sunlightChunks(
  globalChunks: Chunks,
  chunksToSpawn: string[]
) {
  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;
    const res = await chunkWorker.createSunlightQueue(
      globalChunks,
      chunksToSpawn
    );
    const { chunks, sunlightQueue } = res;
    globalChunks = await chunkWorker.floodLight(chunks, sunlightQueue);
    chunksToSpawn.forEach((id) => {
      globalChunks[id].needsLightUpdate = false;
    });
  });

  return globalChunks;
}

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

export async function streamInChunk(globalChunks: Chunks, chunkId: string) {
  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;

    // const newChunks = await chunkWorker.addChunkAtChunkId(
    //   globalChunks,
    //   chunkId
    // );
    if (!globalChunks[chunkId]) {
      globalChunks[chunkId] = makeEmptyChunk();
    }
    globalChunks[chunkId] = await chunkWorker.generateChunkData(
      globalChunks[chunkId],
      chunkId
    );
  });
  return globalChunks;
}
