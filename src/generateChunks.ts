import {
  Chunks,
  surroundingOffsets,
  verticalNumberOfChunks,
} from "./constants";
import { addOffsetToChunkId, makeEmptyChunk } from "./helpers";
import { updateGeometry } from "./updateGeometry";
import {
  getSurroundingChunksColumns,
  mergeChunkUpdates,
  pickSurroundingChunks,
  streamInChunk,
  sunlightChunks,
} from "./streamChunks";
import { chunkWorkerPool } from "./workers/workerPool";
import { Vector3 } from "three";
import { world } from "./world";

export async function generateChunks(chunksToSpawn: string[]) {
  const promises = [];
  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      if (world.globalChunks[chunkIdForSpawning]?.isGenerated) {
        console.log("Chunk already exists");
        continue;
      }
      surroundingOffsets.forEach((offset) => {
        const offVec = new Vector3(...offset);
        if (!world.globalChunks[addOffsetToChunkId(newChunkId, offVec)]) {
          world.globalChunks[addOffsetToChunkId(newChunkId, offVec)] =
            makeEmptyChunk(newChunkId);
        }
      });

      const streamInChunksPromise = streamInChunk(chunkIdForSpawning).then(() =>
        console.log("Chunkdata done")
      );
      promises.push(streamInChunksPromise);
    }
  }

  await Promise.all(promises);

  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

      await chunkWorkerPool.queue(async (worker) => {
        const updatedChunksWithTrees = await worker.growTrees(
          pickSurroundingChunks(chunkIdForSpawning),
          chunkIdForSpawning
        );
        mergeChunkUpdates(updatedChunksWithTrees);
      });
      console.log("Trees done");
    }
  }

  const sunlightPromises = [];
  for (let newChunkId of chunksToSpawn) {
    const { stillNeedUpdates } = await sunlightChunks(
      getSurroundingChunksColumns(newChunkId),
      [newChunkId]
    );
    console.log("Sunlight done", Object.keys(stillNeedUpdates).length);
  }

  await Promise.all(sunlightPromises);

  const updateGeometryPromises = [];
  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      updateGeometryPromises.push(updateGeometry(chunkIdForSpawning));
    }
  }
  await Promise.all(updateGeometryPromises);

  return chunksToSpawn;
}
