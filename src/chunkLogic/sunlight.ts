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
  const floodLightQueue = [...queue] as Position[];
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
    } else {
      floodLightQueue.push([x, y, z]);
    }
  }
  return floodLightQueue;
}

export function sunlightChunks(chunks: Chunks) {
  const chunksThatNeedToBeLit = Object.entries(chunks).filter(
    ([id, { needsLightUpdate, isGenerated }]) => {
      const pos = parseChunkId(id);
      if (needsLightUpdate && pos.y === 0 && isGenerated) {
        chunks[id].needsLightUpdate = false;
        return true;
      }
      return false;
    }
  );

  const queue = chunksThatNeedToBeLit
    .map(([id]) => {
      const [cx, , cz] = computeSmallChunkCornerFromId(id);
      const queue = [] as Position[];
      for (let xOff = 0; xOff < chunkSize; xOff++) {
        for (let zOff = 0; zOff < chunkSize; zOff++) {
          const newPos = [
            xOff + cx,
            verticalNumberOfChunks * chunkSize + chunkSize,
            zOff + cz,
          ] as Position;
          queue.push(newPos);
        }
      }
      return queue;
    })
    .flat();

  console.log(chunksThatNeedToBeLit.length * 16 * 16);
  console.log(queue.length);
  const floodLightQueue = propagateSunlight(chunks, queue);
  return { floodLightQueue, chunks, chunksThatNeedToBeLit };
}

export function sunlightChunkColumnAt(pos: Position, chunks: Chunks) {
  const [cx, _, cz] = getSmallChunkCorner(pos);
  const queue = [] as Position[];
  for (let xOff = 0; xOff < chunkSize; xOff++) {
    for (let zOff = 0; zOff < chunkSize; zOff++) {
      const newPos = [
        xOff + cx,
        verticalNumberOfChunks * chunkSize + chunkSize,
        zOff + cz,
      ] as Position;
      queue.push(newPos);
    }
  }
  const floodLightQueue = propagateSunlight(chunks, queue);
  return { floodLightQueue, sunlitChunks: chunks };
}
