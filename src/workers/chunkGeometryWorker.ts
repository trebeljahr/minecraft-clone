import {
  Chunks,
  transparentBlocks,
  tileSize,
  tileTextureWidth,
  tileTextureHeight,
  chunkSize,
  Position,
  faces,
  terrainHeight,
} from "../constants";
import { getVoxel } from "../helpers";
import { blocks } from "../blocks";
import { expose } from "threads/worker";
import { Vector3 } from "three";
import {
  setVoxel,
  shouldPlaceBlock,
  shouldSpawnDiamonds,
  shouldSpawnDirt,
  shouldSpawnEmeralds,
  shouldSpawnGold,
  shouldSpawnGrass,
  shouldSpawnLapis,
  shouldSpawnTree,
  spawnTree,
} from "../chunkLogic";

const { emerald, lapis, diamond, gold, stone, grass, dirt, cactus } = blocks;

// const spawnMapping = [
//   { block: gold, shouldSpawn: shouldSpawnGold },
//   { block: diamond, shouldSpawn: shouldSpawnDiamonds },
//   { block: lapis, shouldSpawn: shouldSpawnLapis },
//   { block: emerald, shouldSpawn: shouldSpawnEmeralds },
//   { block: grass, shouldSpawn: shouldSpawnGrass },
//   { block: dirt, shouldSpawn: shouldSpawnDirt },
// ];

const chunkGeometryWorker = {
  generateChunkData(chunks: Chunks, posArray: number[]) {
    console.log(chunks);
    console.log(posArray);
    const pos = new Vector3(...posArray)
      .divideScalar(chunkSize)
      .floor()
      .multiplyScalar(chunkSize);
    for (let y = chunkSize - 1; y >= -1; --y) {
      const underBedrock = pos.y + y <= 0;
      const overMaximumHeight = pos.y + y > terrainHeight;
      if (overMaximumHeight || underBedrock) continue;

      for (let z = 0; z < chunkSize; ++z) {
        for (let x = 0; x < chunkSize; ++x) {
          const offsetPos: Position = [pos.x + x, pos.y + y, pos.z + z];
          if (offsetPos.length !== 3) return;
          if (shouldPlaceBlock(offsetPos)) {
            if (shouldSpawnGold(offsetPos)) {
              //           chunks = setVoxel(chunks, offsetPos, gold);
              //         } else if (shouldSpawnDiamonds(...offsetPos)) {
              //           chunks = setVoxel(chunks, offsetPos, diamond);
              //         } else if (shouldSpawnLapis(...offsetPos)) {
              //           chunks = setVoxel(chunks, offsetPos, lapis);
              //         } else if (shouldSpawnEmeralds(...offsetPos)) {
              //           chunks = setVoxel(chunks, offsetPos, emerald);
              //         } else if (shouldSpawnGrass(offsetPos)) {
              //           chunks = setVoxel(chunks, offsetPos, grass);
              //           if (shouldSpawnTree()) {
              //             chunks = spawnTree(chunks, pos.x + x, pos.y + y + 1, pos.z + z);
              //           }
              //         } else if (shouldSpawnDirt(...offsetPos)) {
              //           chunks = setVoxel(chunks, offsetPos, dirt);
              //         } else {
              //           chunks = setVoxel(chunks, offsetPos, stone);
            }
          }
        }
      }
    }
    return chunks;
  },
  generateGeometry(chunks: Chunks, chunkOffset: Position) {
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
