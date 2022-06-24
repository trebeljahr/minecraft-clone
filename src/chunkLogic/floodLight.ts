import { Vector3 } from "three";
import { getChunkForVoxel } from "../chunkLogic";
import {
  Chunks,
  fields,
  LightQueue,
  neighborOffsets,
  Position,
  surroundingOffsets,
  transparentBlocks,
} from "../constants";
import {
  computeChunkId,
  computeVoxelIndex,
  getLightValue,
  SimpleTimer,
} from "../helpers";

const neighbors = [...neighborOffsets].slice(1, neighborOffsets.length);

export async function floodLight(chunks: Chunks, queue: LightQueue) {
  let counter = 0;
  outerLoop: while (queue.length > 0) {
    counter++;
    const {
      pos: [x, y, z],
      lightValue,
      isSunlight,
    } = queue.shift();
    for (let offset of neighbors) {
      const decrement = offset.y === -1 && isSunlight ? 0 : 1;
      const newLightValue = lightValue - decrement;
      if (newLightValue <= 0) continue outerLoop;

      const nx = x + offset.x;
      const ny = y + offset.y;
      const nz = z + offset.z;

      const [neighborsChunk, neighborsChunkId] = getChunkForVoxel(chunks, [
        nx,
        ny,
        nz,
      ]);
      if (!neighborsChunk) {
        console.log(
          chunks,
          [nx, ny, nz],
          neighborsChunk,
          computeChunkId([nx, ny, nz])
        );
        throw Error("Neighbouring chunk not found during flood light prop?");
      }

      const neighborIndex = computeVoxelIndex([nx, ny, nz]);
      const lightValueInNeighbor = neighborsChunk[neighborIndex + fields.light];
      const neighborType = neighborsChunk[neighborIndex];

      const lightIsBrighter = newLightValue > lightValueInNeighbor;
      const neighborIsTransparent = transparentBlocks.includes(neighborType);

      if (lightIsBrighter && neighborIsTransparent) {
        neighborsChunk[neighborIndex + fields.light] = newLightValue;
        queue.push({
          pos: [nx, ny, nz],
          isSunlight: isSunlight && offset.y === -1,
          lightValue: newLightValue,
        });
      }
    }
  }
  console.log(counter);
  return chunks;
}
