import {
  Chunks,
  transparentBlocks,
  tileSize,
  tileTextureWidth,
  tileTextureHeight,
  chunkSize,
  faces,
} from "../constants";
import { computeChunkOffsetFromId, getVoxel } from "../helpers";
import { expose } from "threads/worker";
import { blocks } from "../blocks";
import { generateChunkData } from "../chunkLogic";
const { cactus } = blocks;
// const spawnMapping = [
//   { block: gold, shouldSpawn: shouldSpawnGold },
//   { block: diamond, shouldSpawn: shouldSpawnDiamonds },
//   { block: lapis, shouldSpawn: shouldSpawnLapis },
//   { block: emerald, shouldSpawn: shouldSpawnEmeralds },
//   { block: grass, shouldSpawn: shouldSpawnGrass },
//   { block: dirt, shouldSpawn: shouldSpawnDirt },
// ];

const chunkGeometryWorker = {
  generateChunkData,
  generateGeometry(chunks: Chunks, chunkId: string) {
    const chunkOffset = computeChunkOffsetFromId(chunkId);
    const positions: number[] = [];
    const lightValues: number[] = [];
    const sunlightValues: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const toVoxelCoords = (coord: number) => coord * chunkSize;
    const [startX, startY, startZ] = chunkOffset.map(toVoxelCoords);

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

                  lightValues.push(10 || neighborLight);
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
  },
};

expose(chunkGeometryWorker);
