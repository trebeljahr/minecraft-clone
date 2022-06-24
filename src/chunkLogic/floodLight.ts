import { getChunkForVoxel } from "../chunkLogic";
import {
  Chunks,
  fields,
  LightUpdate,
  LightUpdates,
  neighborOffsets,
  Position,
  transparentBlocks,
} from "../constants";
import { computeVoxelIndex, getLightValue, SimpleTimer } from "../helpers";

const neighbors = [...neighborOffsets].slice(1, neighborOffsets.length);

export async function floodLight(chunks: Chunks, queue: LightUpdate[]) {
  const chunksThatNeedUpdates: LightUpdates = {};
  while (queue.length > 0) {
    const {
      pos: [x, y, z],
      lightValue,
    } = queue.shift();
    const newLightValue = lightValue - 1;
    if (newLightValue <= 0) continue;

    neighbors.forEach((offset) => {
      const nx = x + offset.x;
      const ny = y + offset.y;
      const nz = z + offset.z;

      const [neighborsChunk, chunkId] = getChunkForVoxel(chunks, [nx, ny, nz]);
      if (!neighborsChunk) {
        if (!chunksThatNeedUpdates[chunkId]) {
          chunksThatNeedUpdates[chunkId] = [];
        }
        chunksThatNeedUpdates[chunkId].push({
          lightValue: newLightValue,
          pos: [nx, ny, nz],
        });
        return;
      }

      const neighborIndex = computeVoxelIndex([nx, ny, nz]);
      const lightValueInNeighbor = neighborsChunk[neighborIndex + fields.light];
      const neighborType = neighborsChunk[neighborIndex];

      const lightIsBrighter = newLightValue > lightValueInNeighbor;
      const neighborIsTransparent = transparentBlocks.includes(neighborType);

      if (lightIsBrighter && neighborIsTransparent) {
        neighborsChunk[neighborIndex + fields.light] = newLightValue;
        queue.push({ pos: [nx, ny, nz], lightValue: newLightValue });
      }
    });
  }
  return { updatedChunks: chunks, chunksThatNeedUpdates };
}
