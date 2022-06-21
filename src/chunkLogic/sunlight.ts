import {
  Position,
  chunkSize,
  transparentBlocks,
  Chunks,
  verticalNumberOfChunks,
} from "../constants";
import {
  setLightValue,
  getSmallChunkCorner,
  computeVoxelIndex,
  parseChunkId,
  computeSmallChunkCornerFromId,
} from "../helpers";
import { getChunkForVoxel } from "../chunkLogic";

export function propagateSunlight(chunks: Chunks, queue: Position[]) {
  const sunlightQueue = [...queue] as Position[];
  while (queue.length > 0) {
    const [x, y, z] = queue.shift();
    const yBelow = y - 1;
    const blockBelowIndex = computeVoxelIndex([x, yBelow, z]);
    const [chunkBelow] = getChunkForVoxel(chunks, [x, yBelow, z]);
    if (!chunkBelow || yBelow < 0) {
      continue;
    }

    const blockBelow = chunkBelow[blockBelowIndex];
    const belowIsTransparent = transparentBlocks.includes(blockBelow);
    const canPropagateSunlight = yBelow >= 0 && belowIsTransparent;
    if (canPropagateSunlight) {
      queue.push([x, yBelow, z]);
      setLightValue(chunks, [x, yBelow, z], 15);
    }
    sunlightQueue.push([x, y, z]);
  }
  return sunlightQueue;
}

export async function createSunlightQueue(
  chunks: Chunks,
  chunksThatNeedToBeUpdated: string[]
) {
  // const chunksThatNeedToBeUpdated = Object.entries(chunks).filter(
  //   ([id, { needsLightUpdate, isGenerated }]) => {
  //     const pos = parseChunkId(id);

  //     const canBeLit = needsLightUpdate && pos.y === 0 && isGenerated;
  //     if (canBeLit) {
  //       chunks[id].needsLightUpdate = false;
  //     }
  //     return canBeLit;
  //   }
  // );

  const queue = chunksThatNeedToBeUpdated
    .map((id) => {
      const [cx, , cz] = computeSmallChunkCornerFromId(id);
      const queue = [] as Position[];
      for (let xOff = 0; xOff < chunkSize; xOff++) {
        for (let zOff = 0; zOff < chunkSize; zOff++) {
          const newPos = [
            xOff + cx,
            verticalNumberOfChunks * chunkSize,
            zOff + cz,
          ] as Position;
          queue.push(newPos);
        }
      }
      return queue;
    })
    .flat();

  // console.log("Chunk Which Need Updates", chunksThatNeedToBeUpdated.length);
  // console.log("Sunlight queue", queue.length);
  const sunlightQueue = propagateSunlight(chunks, queue);
  // console.log("FloodLight Queue", sunlightQueue.length);
  return {
    sunlightQueue,
    chunks,
  };
}
