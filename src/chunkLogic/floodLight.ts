import { getChunkForVoxel } from "../chunkLogic";
import {
  Chunks,
  fields,
  neighborOffsets,
  Position,
  transparentBlocks,
} from "../constants";
import { computeVoxelIndex, getLightValue } from "../helpers";

export function floodLight(chunks: Chunks, queue: Position[]) {
  const neighbors = [...neighborOffsets].slice(1, neighborOffsets.length);
  let iterations = 0;
  while (queue.length > 0) {
    iterations++;
    const [x, y, z] = queue.shift();
    const newLightValue = getLightValue(chunks, [x, y, z]) - 1;
    if (newLightValue <= 0) continue;

    neighbors.forEach((offset) => {
      const nx = x + offset.x;
      const ny = y + offset.y;
      const nz = z + offset.z;

      const [neighborsChunk] = getChunkForVoxel(chunks, [nx, ny, nz]);
      if (!neighborsChunk) {
        return;
      }

      const neighborIndex = computeVoxelIndex([nx, ny, nz]);
      const lightValueInNeighbor = neighborsChunk[neighborIndex + fields.light];
      const neighborType = neighborsChunk[neighborIndex];

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
