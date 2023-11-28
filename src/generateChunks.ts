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

export async function generate(chunks: Chunks, chunksToSpawn: string[]) {
  const storedWorld = JSON.parse(localStorage.getItem("world") || "{}");
  world.changedChunks = storedWorld;

  let total = chunksToSpawn.length * (verticalNumberOfChunks + 1);
  let current = 0;

  function updateProgress() {
    let progress = Math.floor((++current / total) * 100);
    updateProgressBar(progress);
  }

  for (let i = 0; i < chunksToSpawn.length; i++) {
    const newChunkId = chunksToSpawn[i];

    if (i % 2 === 0) {
      continue;
    }

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

      chunks = await streamInChunk(chunks, chunkIdForSpawning);

      const updatedChunksWithTrees = await growTrees(
        pickSurroundingChunks(chunks, chunkIdForSpawning),
        chunkIdForSpawning
      );
      mergeChunkUpdates(chunks, updatedChunksWithTrees);
    }

    const { updatedChunks } = await sunlightChunks(
      getSurroundingChunksColumns(chunks, newChunkId),
      [newChunkId]
    );
    mergeChunkUpdates(chunks, updatedChunks);

    for (let y = verticalNumberOfChunks; y >= 0; y--) {
      const chunkIdForSpawning = addOffsetToChunkId(newChunkId, { y });

      await updateGeometry(chunkIdForSpawning);
    }

    updateProgress();
  }

  const progressBarText = document.getElementById("worldLoaderText");
  progressBarText.innerText = "Ready!";

  return chunksToSpawn;
}
