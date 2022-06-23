import { Chunks, neighborOffsets, surroundingOffsets } from "./constants";
import { addOffsetToChunkId, makeEmptyChunk } from "./helpers";
import { chunkWorkerPool } from "./workers/workerPool";
import { ChunkWorkerObject } from "./workers/chunkWorkerObject";
import { pickSurroundingChunks } from "./main";
import { Vector3 } from "three";

export function mergeChunkUpdates(globalChunks: Chunks, updatedChunks: Chunks) {
  Object.keys(updatedChunks).forEach((chunkId) => {
    if (updatedChunks[chunkId]) {
      globalChunks[chunkId] = updatedChunks[chunkId];
    } else {
      throw Error("Trying to merge empty chunks...");
    }
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
    // console.log({ globalChunks });

    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;

    const updatedChunks = await chunkWorker.generateChunkData(
      pickSurroundingChunks(globalChunks, chunkId),
      chunkId
    );
    mergeChunkUpdates(globalChunks, updatedChunks);
  });
  return globalChunks;
}
