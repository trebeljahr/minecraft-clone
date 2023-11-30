import { Vector3 } from "three";
import { growTrees } from "./chunkLogic/generateData";
import {
  Chunks,
  surroundingOffsets,
  verticalNumberOfChunks,
} from "./constants";
import {
  SimpleTimer,
  addOffsetToChunkId,
  getSurroundingChunksColumns,
  makeEmptyChunk,
} from "./helpers";
import { updateProgressBar } from "./progressBar";
import {
  mergeChunkUpdates,
  pickSurroundingChunks,
  streamInChunk,
  sunlightChunks,
} from "./streamChunks";
import { updateGeometry } from "./updateGeometry";
import { world } from "./world";
import { chunkWorkerPool } from "./workers/workerPool";

export async function generate(chunks: Chunks, chunksToSpawn: string[]) {
  const storedWorld = JSON.parse(localStorage.getItem("world") || "{}");
  world.changedChunks = new Map(Object.entries(storedWorld));

  let total = chunksToSpawn.length * (verticalNumberOfChunks + 1);

  let current = 0;

  function updateProgress() {
    let progress = Math.floor((++current / total) * 100);
    updateProgressBar(progress);
  }

  // const sunlightPromises: Promise<void>[] = [];
  const chunkGenPromises = [];

  const logTime = new SimpleTimer();

  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      const chunk = chunks.get(chunkIdForSpawning);
      if (!chunk) {
        chunks.set(chunkIdForSpawning, makeEmptyChunk(chunkIdForSpawning));
      }

      if (chunk?.isGenerated) {
        continue;
      }

      chunkGenPromises.push(
        chunkWorkerPool.queue(async (worker) => {
          const updatedChunks = await worker.generateChunkData(
            world.globalChunks,
            chunkIdForSpawning
          );
          mergeChunkUpdates(chunks, updatedChunks);
        })
      );
    }
  }

  await Promise.all(chunkGenPromises);
  logTime.takenFor("Chunk generation");

  for (let i = 0; i < chunksToSpawn.length; i++) {
    const newChunkId = chunksToSpawn[i];

    if (i % 2 === 0) {
      continue;
    }

    await handleSingleChunkColumnUpdate(newChunkId);
  }

  for (let i = 0; i < chunksToSpawn.length; i++) {
    const newChunkId = chunksToSpawn[i];

    if (i % 2 === 1) {
      continue;
    }

    await handleSingleChunkColumnUpdate(newChunkId);
  }

  async function handleSingleChunkColumnUpdate(newChunkId: string) {
    // for (let y = verticalNumberOfChunks; y >= 0; y--) {
    //   const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
    //   const updatedChunksWithTrees = await growTrees(
    //     pickSurroundingChunks(chunks, chunkIdForSpawning),
    //     chunkIdForSpawning
    //   );
    //   mergeChunkUpdates(chunks, updatedChunksWithTrees);
    // }

    await sunlightChunks(getSurroundingChunksColumns(chunks, newChunkId), [
      newChunkId,
    ]).then(async ({ updatedChunks }) => {
      // mergeChunkUpdates(chunks, updatedChunks);
      updatedChunks.forEach((chunk) => {
        chunks.set(chunk.chunkId, chunk);
      });

      for (let y = verticalNumberOfChunks; y >= 0; y--) {
        const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

        updateGeometry(chunkIdForSpawning);
        updateProgress();
      }
    });
  }

  // await Promise.all(sunlightPromises);
  logTime.takenFor("Sunlight and trees");

  const progressBarText = document.getElementById("worldLoaderText");
  progressBarText.innerText = "Ready!";

  return chunksToSpawn;
}
