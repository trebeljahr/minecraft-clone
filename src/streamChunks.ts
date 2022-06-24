import { Chunk, Chunks } from "./constants";
import { chunkWorkerPool } from "./workers/workerPool";
import { ChunkWorkerObject } from "./workers/chunkWorkerObject";
import { pickSurroundingChunks } from "./main";
import {
  computeSmallChunkCornerFromId,
  getChunkColumn,
  getSurroundingChunksColumns,
  parseChunkId,
} from "./helpers";

function canMergeWithoutOverwrite(older: Chunk, newer: Chunk) {
  return (
    !(older.isGenerated && !newer.isGenerated) &&
    !(!older.needsLightUpdate && newer.needsLightUpdate)
  );
}
export function mergeChunkUpdates(oldChunks: Chunks, updatedChunks: Chunks) {
  Object.keys(updatedChunks).forEach((chunkId) => {
    const older = oldChunks[chunkId];
    const newer = updatedChunks[chunkId];
    if (!older || canMergeWithoutOverwrite(older, newer)) {
      oldChunks[chunkId] = updatedChunks[chunkId];
    }
  });
}

export async function sunlightChunk(globalChunks: Chunks, chunkId: string) {
  const columns = getSurroundingChunksColumns(globalChunks, chunkId);
  await chunkWorkerPool.queue(async (worker) => {
    const chunkWorker = worker as unknown as typeof ChunkWorkerObject;
    const sunlightQueue = await chunkWorker.createSunlightQueue(chunkId);
    const floodlitChunks = await chunkWorker.floodLight(columns, sunlightQueue);
    globalChunks[chunkId].needsLightUpdate = false;
    mergeChunkUpdates(globalChunks, floodlitChunks);
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
