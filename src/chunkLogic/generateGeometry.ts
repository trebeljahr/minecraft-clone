import {
  Chunks,
  transparentBlocks,
  tileSize,
  tileTextureWidth,
  tileTextureHeight,
  chunkSize,
  faces,
} from "../constants";
import { getChunkCoordinatesFromId, getVoxel } from "../helpers";
import { blocks } from "../blocks";
const { cactus } = blocks;

export function generateGeometry(
  chunks: Chunks,
  chunkId: string,
  defaultLight = false
) {
  const chunkCoordinates = getChunkCoordinatesFromId(chunkId);
  const positions: number[] = [];
  const lightValues: number[] = [];
  const sunlightValues: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const toVoxelCoords = (coord: number) => coord * chunkSize;
  const [startX, startY, startZ] = chunkCoordinates.map(toVoxelCoords);

  for (let y = 0; y < chunkSize; ++y) {
    const voxelY = startY + y;
    for (let z = 0; z < chunkSize; ++z) {
      const voxelZ = startZ + z;
      for (let x = 0; x < chunkSize; ++x) {
        const voxelX = startX + x;
        const { type: voxel } = getVoxel(chunks, [voxelX, voxelY, voxelZ]);
        if (voxel) {
          const uvVoxel = voxel - 1;
          for (const { dir, corners, uvRow } of faces) {
            const {
              type: neighbor,
              light: neighborLight,
              sunlight: neighbourSunLight,
            } = getVoxel(chunks, [
              voxelX + dir[0],
              voxelY + dir[1],
              voxelZ + dir[2],
            ]);
            if (
              transparentBlocks.includes(neighbor) ||
              transparentBlocks.includes(voxel)
            ) {
              const ndx = positions.length / 3;

              for (const { pos, uv } of corners) {
                if (voxel === cactus) {
                  positions.push(
                    pos[0] - dir[0] * 0.063 + x,
                    pos[1] + y,
                    pos[2] - dir[2] * 0.063 + z
                  );
                } else {
                  positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                }
                if (defaultLight) {
                  lightValues.push(5);
                } else {
                  lightValues.push(neighborLight);
                }
                sunlightValues.push(neighbourSunLight);
                normals.push(...dir);
                uvs.push(
                  ((uvVoxel + uv[0]) * tileSize) / tileTextureWidth,
                  1 - ((uvRow + 1 - uv[1]) * tileSize) / tileTextureHeight
                );
              }
              indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
            }
          }
        }
      }
    }
  }

  return {
    positions,
    normals,
    indices,
    lightValues,
    uvs,
  };
}
