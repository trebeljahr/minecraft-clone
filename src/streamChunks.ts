import { Chunks, LightUpdates } from "./constants";
import { chunkWorkerPool } from "./workers/workerPool";
import { ChunkWorkerObject } from "./workers/chunkWorkerObject";
import { pickSurroundingChunks } from "./main";

export function mergeChunkUpdates(globalChunks: Chunks, updatedChunks: Chunks) {
  Object.keys(updatedChunks).forEach((chunkId) => {
    if (updatedChunks[chunkId]) {
      const shouldMerge = !(
        globalChunks[chunkId]?.isGenerated &&
        !updatedChunks[chunkId]?.isGenerated
      );
      if (shouldMerge) {
        globalChunks[chunkId] = updatedChunks[chunkId];
      }
    } else {
      throw Error("Trying to merge empty chunks...");
    }
  });
}

export async function sunlightChunks(
  availableChunks: Chunks,
  chunksToLight: string[]
) {
  let stillNeedUpdates: LightUpdates;
  await chunkWorkerPool.queue(async (worker) => {
    const { chunks, sunlightQueue } = await worker.createSunlightQueue(
      availableChunks,
      chunksToLight
    );
    mergeChunkUpdates(availableChunks, chunks);
    const { updatedChunks, chunksThatNeedUpdates } = await worker.floodLight(
      availableChunks,
      sunlightQueue
    );
    mergeChunkUpdates(availableChunks, updatedChunks);
    stillNeedUpdates = chunksThatNeedUpdates;
  });

  return { updatedChunks: availableChunks, stillNeedUpdates };
}

export async function streamInChunk(globalChunks: Chunks, chunkId: string) {
  await chunkWorkerPool.queue(async (worker) => {
    const updatedChunks = await worker.generateChunkData(
      pickSurroundingChunks(globalChunks, chunkId),
      chunkId
    );
    mergeChunkUpdates(globalChunks, updatedChunks);
  });
  return globalChunks;
}
