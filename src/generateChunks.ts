import { Vector3 } from "three";
import { growTrees } from "./chunkLogic/generateData";
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
  world.changedChunks = storedWorld;

  let total = chunksToSpawn.length * (verticalNumberOfChunks + 1);

  let current = 0;

  function updateProgress() {
    let progress = Math.floor((++current / total) * 100);
    updateProgressBar(progress);
  }

  const sunlightPromises: Promise<void>[] = [];
  const chunkGenPromises: Promise<Chunks>[] = [];

  for (let newChunkId of chunksToSpawn) {
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      if (!chunks[chunkIdForSpawning]) {
        chunks[chunkIdForSpawning] = makeEmptyChunk(chunkIdForSpawning);
      }

      if (chunks[chunkIdForSpawning]?.isGenerated) {
        continue;
      }

      if (storedWorld && storedWorld[chunkIdForSpawning]) {
        chunks[chunkIdForSpawning] = storedWorld[chunkIdForSpawning];
        continue;
      }

      // surroundingOffsets.forEach((offset) => {
      //   const offVec = new Vector3(...offset);
      //   if (!chunks[addOffsetToChunkId(chunkIdForSpawning, offVec)]) {
      //     chunks[addOffsetToChunkId(chunkIdForSpawning, offVec)] =
      //       makeEmptyChunk(chunkIdForSpawning);
      //   }
      // });

      // console.log(chunks);

      chunkGenPromises.push(
        chunkWorkerPool.queue(async (worker) => {
          const updatedChunks = await worker.generateChunkData(
            { [chunkIdForSpawning]: chunks[chunkIdForSpawning] },
            chunkIdForSpawning
          );
          mergeChunkUpdates(chunks, updatedChunks);
        }) as unknown as Promise<Chunks>
      );
    }
  }

  await Promise.all(chunkGenPromises);
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
    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });
      const updatedChunksWithTrees = await growTrees(
        pickSurroundingChunks(chunks, chunkIdForSpawning),
        chunkIdForSpawning
      );
      mergeChunkUpdates(chunks, updatedChunksWithTrees);
    }

    sunlightPromises.push(
      sunlightChunks(getSurroundingChunksColumns(chunks, newChunkId), [
        newChunkId,
      ]).then(async ({ updatedChunks }) => {
        mergeChunkUpdates(chunks, updatedChunks);

        for (let y = verticalNumberOfChunks; y >= 0; y--) {
          const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

          updateGeometry(chunkIdForSpawning);
          updateProgress();
        }
      })
    );
  }

  await Promise.all(sunlightPromises);

  const progressBarText = document.getElementById("worldLoaderText");
  progressBarText.innerText = "Ready!";

  return chunksToSpawn;
}
