import { Material, Mesh, Vector3 } from "three";
import { figureOutChunksToSpawn } from "./chunkLogic/figureOutChunksToSpawn";
import {
  Chunks,
  LightUpdates,
  Position,
  surroundingOffsets,
  viewDistance,
} from "./constants";
import { generate } from "./generateChunks";
import {
  addOffsetToChunkId,
  computeChunkColumnId,
  computeChunkId,
  getChunkCoordinatesFromId,
  makeEmptyChunk,
} from "./helpers";
import { player } from "./Player";
import { updateGeometry } from "./updateGeometry";
import { chunkWorkerPool } from "./workers/workerPool";
import { world } from "./world";

let chunkLoadingQueue: string[] = [];

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

export function shouldChunksUpdate() {
  const newChunkId = computeChunkColumnId(player.position.toArray());
  if (world.lastChunkId !== newChunkId) {
    world.lastChunkId = newChunkId;
    handleChunks();
  }
}

function deleteElementFromScene(nameToDelete: string) {
  const object = world.scene.getObjectByName(nameToDelete) as Mesh;

  object?.geometry?.dispose();
  (object?.material as Material)?.dispose();
  object && world.scene.remove(object);
}

export function pruneChunks(playerPosition: Vector3) {
  Object.keys(world.globalChunks)
    .filter((id) => {
      const currentChunkId = computeChunkId(playerPosition.toArray());
      const [x, , z] = getChunkCoordinatesFromId(id);
      const [x2, , z2] = getChunkCoordinatesFromId(currentChunkId);
      const outOfView =
        Math.abs(x - x2) > viewDistance + 1 ||
        Math.abs(z - z2) > viewDistance + 1;
      return outOfView;
    })
    .forEach((idToDelete) => {
      delete world.meshes[idToDelete];
      delete world.debugMeshes[idToDelete];
      delete world.globalChunks[idToDelete];
      deleteElementFromScene("chunk:" + idToDelete);
      deleteElementFromScene("debug:" + idToDelete);
      world.renderer.renderLists.dispose();
    });
}

export async function handleChunks() {
  if (chunkLoadingQueue.length > 0) {
    return;
  }

  const chunksToSpawn = await figureOutChunksToSpawn(chunkLoadingQueue);
  chunkLoadingQueue.push(...chunksToSpawn);
  const chunksSpawned = await generate(world.globalChunks, chunksToSpawn);

  chunkLoadingQueue = chunkLoadingQueue.filter(
    (id) => !chunksSpawned.includes(id)
  );
  pruneChunks(player.position);
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

export async function streamInChunk(chunks: Chunks, chunkId: string) {
  await chunkWorkerPool.queue(async (worker) => {
    const updatedChunks = await worker.generateChunkData(
      pickSurroundingChunks(chunks, chunkId),
      chunkId
    );
    mergeChunkUpdates(chunks, updatedChunks);
  });
  return chunks;
}
