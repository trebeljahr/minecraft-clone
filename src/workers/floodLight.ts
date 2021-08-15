import { expose } from "threads/worker";
import {
  maxHeight,
  Position,
  chunkSize,
  transparentBlocks,
  neighborOffsets,
  fields,
  Chunks,
} from "../constants";
import {
  computeChunkOffset,
  computeVoxelIndex,
  addChunkForVoxel,
} from "../helpers";

async function propagateSunlight(chunks: Chunks, queue: Position[]) {
  const floodLightQueue = [...queue] as Position[];
  while (queue.length > 0) {
    const [x, y, z] = queue.shift();

    const yBelow = y - 1;
    const blockBelowIndex = computeVoxelIndex([x, yBelow, z]);
    const { addedChunk: blockBelowChunk } = addChunkForVoxel(chunks, [
      x,
      yBelow,
      z,
    ]);
    const blockBelow = blockBelowChunk[blockBelowIndex];

    const belowIsTransparent = transparentBlocks.includes(blockBelow);
    const canPropagateSunlight = yBelow >= 0 && belowIsTransparent;
    if (canPropagateSunlight) {
      queue.push([x, yBelow, z]);
      // setLightValue([x, yBelow, z], 15);
      floodLightQueue.push([x, yBelow, z]);
    }
  }
  return floodLight(chunks, floodLightQueue);
}

async function floodLight(chunks: Chunks, queue: Position[]) {
  const neighbors = [...neighborOffsets].slice(1, neighborOffsets.length);
  while (queue.length > 0) {
    const [x, y, z] = queue.shift();
    const { addedChunk: chunk } = addChunkForVoxel(chunks, [x, y, z]);
    const blockIndex = computeVoxelIndex([x, y, z]);
    const blockLightValue = chunk[blockIndex + fields.light];

    neighbors.forEach((offset) => {
      const nx = x + offset.x;
      const ny = y + offset.y;
      const nz = z + offset.z;

      const newLightValue = blockLightValue - 1;

      if (newLightValue <= 0) return;

      const { addedChunk: neighborsChunk } = addChunkForVoxel(chunks, [
        nx,
        ny,
        nz,
      ]);
      const neighborIndex = computeVoxelIndex([nx, ny, nz]);
      let lightValueInNeighbor = neighborsChunk[neighborIndex + fields.light];
      let neighborType = neighborsChunk[neighborIndex];

      const lightIsBrighter = newLightValue > lightValueInNeighbor;
      const neighborIsTransparent = transparentBlocks.includes(neighborType);

      const shouldPropagate = lightIsBrighter && neighborIsTransparent;
      if (shouldPropagate) {
        neighborsChunk[neighborIndex + fields.light] = newLightValue;
        queue.push([nx, ny, nz]);
      }
    });
  }
  return chunks;
}

expose({
  async sunlightChunkColumnAt(
    pos: Position,
    chunks: Record<string, Uint8Array>
  ) {
    const [cx, _, cz] = computeChunkOffset(pos);
    const queue = [] as Position[];
    for (let xOff = 0; xOff < chunkSize; xOff++) {
      for (let zOff = 0; zOff < chunkSize; zOff++) {
        const newPos = [xOff + cx, maxHeight, zOff + cz] as Position;
        queue.push(newPos);
      }
    }
    return await propagateSunlight(chunks, queue);
  },
  floodLight,
});
