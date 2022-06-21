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
  chunksToLight: string[]
) {
  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;
    const logTime = new SimpleTimer();
    const { chunks, sunlightQueue } = await chunkWorker.createSunlightQueue(
      globalChunks,
      chunksToLight
    );
    globalChunks = chunks;
    logTime.takenFor("Sunlight Propagation");
    globalChunks = await chunkWorker.floodLight(chunks, sunlightQueue);
    logTime.takenFor("Floodlight Propagation");
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
