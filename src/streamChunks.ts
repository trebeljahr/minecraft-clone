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

export function mergeChunkUpdates(globalChunks: Chunks, updatedChunks: Chunks) {
  Object.keys(updatedChunks).forEach((chunkId) => {
    globalChunks[chunkId] = updatedChunks[chunkId];
  });
}

export async function sunlightChunks(
  globalChunks: Chunks,
  chunksToLight: string[]
) {
  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;
    const { chunks, sunlightQueue } = await chunkWorker.createSunlightQueue(
      globalChunks,
      chunksToLight
    );
    mergeChunkUpdates(globalChunks, chunks);
    const sunlitChunks = await chunkWorker.floodLight(
      globalChunks,
      sunlightQueue
    );
    mergeChunkUpdates(globalChunks, sunlitChunks);
  });

  return globalChunks;
}

export async function streamInChunk(globalChunks: Chunks, chunkId: string) {
  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;
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
