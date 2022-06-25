import { Vector3 } from "three";
import {
  Chunks,
  LightUpdates,
  Position,
  surroundingOffsets,
} from "./constants";
import { addOffsetToChunkId, computeChunkId, makeEmptyChunk } from "./helpers";
import { updateGeometry } from "./updateGeometry";
import { chunkWorkerPool } from "./workers/workerPool";
import { world } from "./world";

export function pickSurroundingChunks(globalChunks: Chunks, chunkId: string) {
  return surroundingOffsets.reduce((output, offset) => {
    const nextChunkId = addOffsetToChunkId(chunkId, new Vector3(...offset));
    const nextChunk = globalChunks[nextChunkId];
    // if (!nextChunk) {
    //   console.log(chunkId, globalChunks, nextChunkId);
    //   throw Error("No next chunk in global chunks");
    // }
    return {
      ...output,
      [nextChunkId]: nextChunk || makeEmptyChunk(nextChunkId),
    };
  }, {});
}

export async function updateSurroundingChunkGeometry(pos: Position) {
  const chunksToUpdateSet = new Set<string>();
  const chunkId = computeChunkId(pos);
  surroundingOffsets.forEach((dir) => {
    const neighbourChunkId = addOffsetToChunkId(chunkId, new Vector3(...dir));
    chunksToUpdateSet.add(neighbourChunkId);
  });
  const chunkUpdatePromises = [...chunksToUpdateSet].map((chunkId) =>
    updateGeometry(chunkId)
  );
  return Promise.all(chunkUpdatePromises);
}

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
