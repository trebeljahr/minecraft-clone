import {
  maxHeight,
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
  addChunkForVoxel,
  computeChunkId,
} from "../helpers";
import { expose } from "threads/worker";
import { getChunkForVoxel } from "../chunkLogic";

function propagateSunlight(chunks: Chunks, queue: Position[]) {
  const floodLightQueue = [...queue] as Position[];
  while (queue.length > 0) {
    const [x, y, z] = queue.shift();
    const yBelow = y - 1;
    const blockBelowIndex = computeVoxelIndex([x, yBelow, z]);
    // console.log(Object.keys(chunks));
    // console.log(computeChunkId([x, yBelow, z]));
    const [chunkBelow, chunkId] = getChunkForVoxel(chunks, [x, yBelow, z]);
    if (!chunkBelow || yBelow < 0) {
      // console.log("No chunk found below?", chunkBelow);
      // console.log("yBelow?", yBelow);

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

const sunlightWorker = {
  sunlightChunkColumnAt(pos: Position, chunks: Chunks) {
    const [cx, _, cz] = getSmallChunkCorner(pos);
    console.log(cx, cz);
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
    // console.log("Queue after initializing sunlight: ", queue.length);
    const floodLightQueue = propagateSunlight(chunks, queue);
    return { floodLightQueue, sunlitChunks: chunks };
  },
};

expose(sunlightWorker);
