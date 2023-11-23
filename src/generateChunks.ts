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
import { updateProgressBar } from "./progressBar";

export async function generate(chunks: Chunks, chunksToSpawn: string[]) {
  const promises = [];
  const storedWorld = JSON.parse(localStorage.getItem("world") || "{}");
  world.changedChunks = storedWorld;

  let total = chunksToSpawn.length * (verticalNumberOfChunks + 1);
  let current = 0;

  function updateProgress() {
    let progress = Math.floor((++current / total) * 100);
    updateProgressBar(progress);
  }

  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      if (chunks[chunkIdForSpawning]?.isGenerated) {
        updateProgress();
        continue;
      }

      if (storedWorld && storedWorld[chunkIdForSpawning]) {
        chunks[chunkIdForSpawning] = storedWorld[chunkIdForSpawning];
        updateProgress();
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
        updateProgress();
      });

      promises.push(streamInChunksPromise);
    }
  }

  await Promise.all(promises);

  const progressBarText = document.getElementById("worldLoaderText");
  progressBarText.innerText = "Growing Trees...";
  current = 0;

  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

      await chunkWorkerPool.queue(async (worker) => {
        const updatedChunksWithTrees = await worker.growTrees(
          pickSurroundingChunks(chunks, chunkIdForSpawning),
          chunkIdForSpawning
        );
        mergeChunkUpdates(chunks, updatedChunksWithTrees);
        updateProgress();
      });
    }
  }

  progressBarText.innerText = "Adding sunlight...";
  current = 0;
  total = chunksToSpawn.length;

  const sunlightPromises = [];
  for (let newChunkId of chunksToSpawn) {
    const { updatedChunks, stillNeedUpdates } = await sunlightChunks(
      getSurroundingChunksColumns(chunks, newChunkId),
      [newChunkId]
    );
    mergeChunkUpdates(chunks, updatedChunks);
    updateProgress();

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

  progressBarText.innerText = "Finalizing...";
  total = chunksToSpawn.length * (verticalNumberOfChunks + 1);
  current = 0;

  const updateGeometryPromises = [];
  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

      // const pos = computeSmallChunkCornerFromId(chunkIdForSpawning);
      // updateGeometryPromises.push(updateSurroundingChunkGeometry(pos));
      updateGeometryPromises.push(
        updateGeometry(chunkIdForSpawning).then(() => {
          updateProgress();
        })
      );
    }
  }
  await Promise.all(updateGeometryPromises);

  progressBarText.innerText = "Ready!";

  return chunksToSpawn;
}
