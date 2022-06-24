import {
  Position,
  chunkSize,
  transparentBlocks,
  Chunks,
  verticalNumberOfChunks,
  LightUpdate,
} from "../constants";
import {
  setLightValue,
  getSmallChunkCorner,
  computeVoxelIndex,
  parseChunkId,
  computeSmallChunkCornerFromId,
  SimpleTimer,
} from "../helpers";
import { getChunkForVoxel } from "../chunkLogic";

export function propagateSunlight(chunks: Chunks, queue: LightUpdate[]) {
  const sunlightQueue = [...queue] as LightUpdate[];
  let iterations = 0;
  while (queue.length > 0) {
    iterations++;
    const {
      pos: [x, y, z],
      lightValue,
    } = queue.shift();
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
      queue.push({ pos: [x, yBelow, z], lightValue });
      setLightValue(chunks, [x, yBelow, z], lightValue);
    }
    sunlightQueue.push({ pos: [x, y, z], lightValue });
  }
  return sunlightQueue;
}

export async function createSunlightQueue(
  chunks: Chunks,
  chunksThatNeedToBeUpdated: string[]
) {
  const queue = chunksThatNeedToBeUpdated
    .map((id) => {
      const [cx, , cz] = computeSmallChunkCornerFromId(id);
      const queue = [] as LightUpdate[];
      for (let xOff = 0; xOff < chunkSize; xOff++) {
        for (let zOff = 0; zOff < chunkSize; zOff++) {
          const pos = [
            xOff + cx,
            verticalNumberOfChunks * chunkSize,
            zOff + cz,
          ] as Position;
          queue.push({ pos, lightValue: 15 });
        }
      }
      return queue;
    })
    .flat();
  // queue is correct length!

  const sunlightQueue = propagateSunlight(chunks, queue);
  return {
    sunlightQueue,
    chunks,
  };
}
