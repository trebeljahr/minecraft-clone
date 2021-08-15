import { expose } from "threads/worker";
import { World } from "../VoxelWorld";
import { fields } from "./constants";

function setLightValue(chunk: Uint8Array, pos: Position, lightValue: number) {
  const blockIndex = this.computeVoxelIndex(pos);
  chunk[blockIndex + fields.light] = lightValue;
  return chunk;
}

async function propagateSunlight(queue: Position[]) {
  const floodLightQueue = [...queue] as Position[];
  while (queue.length > 0) {
    const [x, y, z] = queue.shift();

    const yBelow = y - 1;
    const blockBelowIndex = this.computeVoxelIndex([x, yBelow, z]);
    const { chunk: blockBelowChunk } = this.addChunkForVoxel([x, yBelow, z]);
    const blockBelow = blockBelowChunk[blockBelowIndex];

    const belowIsTransparent = transparentBlocks.includes(blockBelow);
    const canPropagateSunlight = yBelow >= 0 && belowIsTransparent;
    if (canPropagateSunlight) {
      queue.push([x, yBelow, z]);
      this.setLightValue([x, yBelow, z], 15);
      floodLightQueue.push([x, yBelow, z]);
    }
  }
  await this.floodLight(floodLightQueue);
}

async function floodLight(queue: Position[]) {
  const neighbors = [...neighborOffsets].slice(1, neighborOffsets.length);
  while (queue.length > 0) {
    const [x, y, z] = queue.shift();
    const { chunk } = this.addChunkForVoxel([x, y, z]);
    const blockIndex = this.computeVoxelIndex([x, y, z]);
    const blockLightValue = chunk[blockIndex + fields.light];

    neighbors.forEach((offset) => {
      const nx = x + offset.x;
      const ny = y + offset.y;
      const nz = z + offset.z;

      const newLightValue = blockLightValue - 1;

      if (newLightValue <= 0) return;

      const { chunk: neighborsChunk } = this.addChunkForVoxel([nx, ny, nz]);
      const neighborIndex = this.computeVoxelIndex([nx, ny, nz]);
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
}

expose({
  floodLight(chunks: Record<string, Uint8Array>, queue: Position[]) {
    const [cx, _, cz] = this.computeChunkOffset(pos);
    const queue = [];
    for (let xOff = 0; xOff < chunkSize; xOff++) {
      for (let zOff = 0; zOff < chunkSize; zOff++) {
        const newPos = [xOff + cx, maxHeight, zOff + cz] as Position;
        queue.push(newPos);
      }
    }
    propagateSunlight(queue);

    return chunks;
  },
});
