import { expose } from "threads/worker";
import { getLightValue, computeVoxelIndex, addChunkForVoxel } from "../helpers";
import {
  Position,
  transparentBlocks,
  neighborOffsets,
  fields,
  Chunks,
} from "../constants";

const floodLightWorker = {
  floodLight(chunks: Chunks, queue: Position[]) {
    console.log("Flood Light Queue lenght:  ", queue.length);
    const neighbors = [...neighborOffsets].slice(1, neighborOffsets.length);
    let counter = 0;
    while (queue.length > 0) {
      counter++;
      const [x, y, z] = queue.shift();
      const newLightValue = getLightValue(chunks, [x, y, z]) - 1;
      if (newLightValue <= 0) continue;

      neighbors.forEach((offset) => {
        const nx = x + offset.x;
        const ny = y + offset.y;
        const nz = z + offset.z;

        const { addedChunk: neighborsChunk } = addChunkForVoxel(chunks, [
          nx,
          ny,
          nz,
        ]);
        const neighborIndex = computeVoxelIndex([nx, ny, nz]);
        const lightValueInNeighbor =
          neighborsChunk[neighborIndex + fields.light];
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
    console.log(`${counter} iterations of floodlight queue`);

    return chunks;
  },
};

expose(floodLightWorker);
