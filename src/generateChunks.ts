import {
  Chunks,
  surroundingOffsets,
  verticalNumberOfChunks,
} from "./constants";
import {
  addOffsetToChunkId,
  getSurroundingChunksColumns,
  makeEmptyChunk,
} from "./helpers";
import { updateGeometry } from "./updateGeometry";
import {
  mergeChunkUpdates,
  pickSurroundingChunks,
  streamInChunk,
  sunlightChunks,
} from "./streamChunks";
import { chunkWorkerPool } from "./workers/workerPool";
import { Vector3 } from "three";
import { world } from "./world";

export async function generate(chunks: Chunks, chunksToSpawn: string[]) {
  const promises = [];
  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      if (chunks[chunkIdForSpawning]?.isGenerated) {
        console.log("Chunk already exists");
        continue;
      }
      surroundingOffsets.forEach((offset) => {
        const offVec = new Vector3(...offset);
        if (!chunks[addOffsetToChunkId(newChunkId, offVec)]) {
          chunks[addOffsetToChunkId(newChunkId, offVec)] =
            makeEmptyChunk(newChunkId);
        }
      });

      const streamInChunksPromise = streamInChunk(
        chunks,
        chunkIdForSpawning
      ).then((chunks) => {
        chunks = chunks;
      });
      promises.push(streamInChunksPromise);
    }
  }

  await Promise.all(promises);

  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

      await chunkWorkerPool.queue(async (worker) => {
        const updatedChunksWithTrees = await worker.growTrees(
          pickSurroundingChunks(chunks, chunkIdForSpawning),
          chunkIdForSpawning
        );
        mergeChunkUpdates(chunks, updatedChunksWithTrees);
      });
    }
  }

  const sunlightPromises = [];
  for (let newChunkId of chunksToSpawn) {
    const { updatedChunks, stillNeedUpdates } = await sunlightChunks(
      getSurroundingChunksColumns(chunks, newChunkId),
      [newChunkId]
    );
    mergeChunkUpdates(chunks, updatedChunks);
    // console.log(Object.keys(stillNeedUpdates).length);

    // Object.keys(stillNeedUpdates).forEach((chunkId) => {
    //   sunlightPromises.push(
    //     chunkWorkerPool.queue(async (worker) => {
    //       const { updatedChunks } = await worker.floodLight(
    //         pickSurroundingChunks(globalChunks, chunkId),
    //         stillNeedUpdates[chunkId]
    //       );
    //       mergeChunkUpdates(globalChunks, updatedChunks);
    //     })
    //   );
    // });
  }

  await Promise.all(sunlightPromises);

  const updateGeometryPromises = [];
  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

      // const pos = computeSmallChunkCornerFromId(chunkIdForSpawning);
      // updateGeometryPromises.push(updateSurroundingChunkGeometry(pos));
      updateGeometryPromises.push(updateGeometry(chunkIdForSpawning));
    }
  }
  await Promise.all(updateGeometryPromises);

  return chunksToSpawn;
}
