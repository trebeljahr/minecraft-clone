import * as THREE from "three";
import { cactus, copy, transparentBlocks } from "./constants";
import { chunkSize } from "./createChunk";

const faces = [
  {
    // left
    uvRow: 1,
    dir: [-1, 0, 0],
    corners: [
      { pos: [0, 1, 0], uv: [0, 1] },
      { pos: [0, 0, 0], uv: [0, 0] },
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [0, 0, 1], uv: [1, 0] },
    ],
  },
  {
    // right
    uvRow: 1,
    dir: [1, 0, 0],
    corners: [
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [1, 1, 0], uv: [1, 1] },
      { pos: [1, 0, 0], uv: [1, 0] },
    ],
  },
  {
    // bottom
    uvRow: 2,
    dir: [0, -1, 0],
    corners: [
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [1, 1] },
      { pos: [0, 0, 0], uv: [0, 1] },
    ],
  },
  {
    // top
    uvRow: 0,
    dir: [0, 1, 0],
    corners: [
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 0] },
    ],
  },
  {
    // back
    uvRow: 1,
    dir: [0, 0, -1],
    corners: [
      { pos: [1, 0, 0], uv: [0, 0] },
      { pos: [0, 0, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 1] },
    ],
  },
  {
    // front
    uvRow: 1,
    dir: [0, 0, 1],
    corners: [
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 1, 1], uv: [0, 1] },
      { pos: [1, 1, 1], uv: [1, 1] },
    ],
  },
];

export class World {
  private chunkSize: number;
  private chunkSliceSize: number;
  public chunks: Record<string, Uint8Array>;
  private tileSize: number;
  private tileTextureWidth: number;
  private tileTextureHeight: number;
  constructor(options: {
    chunkSize: number;
    tileSize: number;
    tileTextureWidth: number;
    tileTextureHeight: number;
  }) {
    this.chunkSize = options.chunkSize;
    this.tileSize = options.tileSize;
    this.tileTextureWidth = options.tileTextureWidth;
    this.tileTextureHeight = options.tileTextureHeight;
    const { chunkSize } = this;
    this.chunkSliceSize = chunkSize * chunkSize;
    this.chunks = {};
  }
  computeVoxelCoordinates(pos: THREE.Vector3) {
    return copy(pos).floor();
  }
  computeVoxelOffset(x: number, y: number, z: number) {
    const { chunkSize, chunkSliceSize } = this;
    const voxelX = THREE.MathUtils.euclideanModulo(x, chunkSize) | 0;
    const voxelY = THREE.MathUtils.euclideanModulo(y, chunkSize) | 0;
    const voxelZ = THREE.MathUtils.euclideanModulo(z, chunkSize) | 0;
    return voxelY * chunkSliceSize + voxelZ * chunkSize + voxelX;
  }
  getChunkForVoxel(x: number, y: number, z: number) {
    return this.chunks[this.computeChunkId(x, y, z)];
  }
  computeChunkId(x: number, y: number, z: number) {
    const { chunkSize } = this;
    const chunkX = Math.floor(x / chunkSize);
    const chunkY = Math.floor(y / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);
    return `${chunkX},${chunkY},${chunkZ}`;
  }
  setVoxel(x: number, y: number, z: number, v: number, addChunk = true) {
    let chunk = this.getChunkForVoxel(x, y, z);
    if (!chunk) {
      if (!addChunk) {
        return;
      }
      chunk = this.addChunkForVoxel(x, y, z);
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    chunk[voxelOffset] = v;
  }
  addChunkForVoxel(x: number, y: number, z: number) {
    const chunkId = this.computeChunkId(x, y, z);
    let chunk = this.chunks[chunkId];
    if (!chunk) {
      const { chunkSize } = this;
      chunk = new Uint8Array(chunkSize * chunkSize * chunkSize);
      this.chunks[chunkId] = chunk;
    }
    return chunk;
  }

  getVoxel(x: number, y: number, z: number) {
    const chunk = this.getChunkForVoxel(x, y, z);
    if (!chunk) {
      return 0;
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    return chunk[voxelOffset];
  }
  generateGeometryDataForChunk(chunkX: number, chunkY: number, chunkZ: number) {
    const {
      chunkSize: chunkSize,
      tileSize,
      tileTextureWidth,
      tileTextureHeight,
    } = this;
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const startX = chunkX * chunkSize;
    const startY = chunkY * chunkSize;
    const startZ = chunkZ * chunkSize;

    for (let y = 0; y < chunkSize; ++y) {
      const voxelY = startY + y;
      for (let z = 0; z < chunkSize; ++z) {
        const voxelZ = startZ + z;
        for (let x = 0; x < chunkSize; ++x) {
          const voxelX = startX + x;
          const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
          if (voxel) {
            // voxel 0 is sky (empty) so for UVs we start at 0
            const uvVoxel = voxel - 1;
            // There is a voxel here but do we need faces for it?
            for (const { dir, corners, uvRow } of faces) {
              const neighbor = this.getVoxel(
                voxelX + dir[0],
                voxelY + dir[1],
                voxelZ + dir[2]
              );
              if (
                !neighbor ||
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
      uvs,
    };
  }
  intersectRay(
    start: THREE.Vector3,
    end: THREE.Vector3,
    velocity = 6
  ): {
    position: [number, number, number];
    normal: [number, number, number];
    voxel: number;
  } {
    const { x: dx, y: dy, z: dz } = new THREE.Vector3()
      .copy(end)
      .sub(start)
      .normalize();

    let t = 0.0;
    let { x: ix, y: iy, z: iz } = new THREE.Vector3().copy(start).floor();

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const txDelta = Math.abs(1 / dx);
    const tyDelta = Math.abs(1 / dy);
    const tzDelta = Math.abs(1 / dz);

    const xDist = stepX > 0 ? ix + 1 - start.x : start.x - ix;
    const yDist = stepY > 0 ? iy + 1 - start.y : start.y - iy;
    const zDist = stepZ > 0 ? iz + 1 - start.z : start.z - iz;

    // location of nearest voxel boundary, in units of t
    let txMax = txDelta < Infinity ? txDelta * xDist : Infinity;
    let tyMax = tyDelta < Infinity ? tyDelta * yDist : Infinity;
    let tzMax = tzDelta < Infinity ? tzDelta * zDist : Infinity;

    let steppedIndex = -1;

    // main loop along raycast vector
    while (t <= velocity) {
      const voxel = this.getVoxel(ix, iy, iz);
      if (voxel) {
        return {
          position: [start.x + t * dx, start.y + t * dy, start.z + t * dz],
          normal: [
            steppedIndex === 0 ? -stepX : 0,
            steppedIndex === 1 ? -stepY : 0,
            steppedIndex === 2 ? -stepZ : 0,
          ],
          voxel,
        };
      }

      // advance t to next nearest voxel boundary
      if (txMax < tyMax) {
        if (txMax < tzMax) {
          ix += stepX;
          t = txMax;
          txMax += txDelta;
          steppedIndex = 0;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      } else {
        if (tyMax < tzMax) {
          iy += stepY;
          t = tyMax;
          tyMax += tyDelta;
          steppedIndex = 1;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      }
    }
    return null;
  }

  // propagate() {
  //   const { fields, getVoxel, maxHeight, maxLight, size } = Chunk;
  //   const {
  //     voxels,
  //     world: {
  //       generator: { types },
  //     },
  //   } = this;
  //   const lightQueue = [];
  //   const sunlightQueue = [];
  //   const trees = [];
  //   for (let x = 0; x < size; x += 1) {
  //     for (let y = 0; y < maxHeight; y += 1) {
  //       for (let z = 0; z < size; z += 1) {
  //         const voxel = getVoxel(x, y, z);
  //         const type = voxels[voxel];
  //         if (type === types.sapling) {
  //           trees.push({
  //             sapling: { x, y, z },
  //             height: voxels[voxel + fields.r],
  //             hue: voxels[voxel + fields.g],
  //             radius: voxels[voxel + fields.b],
  //           });
  //         } else if (types[type].isLight) {
  //           voxels[voxel + fields.light] = maxLight;
  //           lightQueue.push({ x, y, z });
  //         }
  //       }
  //     }
  //   }
  //   const top = maxHeight - 1;
  //   for (let x = 0; x < size; x += 1) {
  //     for (let z = 0; z < size; z += 1) {
  //       const voxel = getVoxel(x, top, z);
  //       const type = voxels[voxel];
  //       if (types[type].isTransparent) {
  //         voxels[voxel + fields.sunlight] = maxLight;
  //         sunlightQueue.push({ x, y: top, z });
  //       }
  //     }
  //   }
  //   this.floodLight(lightQueue, "light");
  //   this.floodLight(sunlightQueue, "sunlight");
  // }

  // floodLight(queue, key = "light") {
  //   const {
  //     fields,
  //     getVoxel,
  //     maxHeight,
  //     maxLight,
  //     size,
  //     voxelNeighbors,
  //   } = Chunk;
  //   const {
  //     world: {
  //       generator: { types },
  //     },
  //   } = this;
  //   const isSunLight = key === "sunlight";
  //   while (queue.length) {
  //     const { x, y, z } = queue.shift();
  //     const { chunk, cx, cz } = this.get(x, z);
  //     const light = chunk.voxels[getVoxel(cx, y, cz) + fields[key]];
  //     voxelNeighbors.forEach((offset) => {
  //       const ny = y + offset.y;
  //       if (ny < 0 || ny >= maxHeight) {
  //         return;
  //       }
  //       const nx = x + offset.x;
  //       const nz = z + offset.z;
  //       const nl =
  //         light - (isSunLight && offset.y === -1 && light === maxLight ? 0 : 1);
  //       const { chunk, cx, cz } = this.get(nx, nz);
  //       const voxel = getVoxel(cx, ny, cz);
  //       if (
  //         !types[chunk.voxels[voxel]].isTransparent ||
  //         (isSunLight &&
  //           offset.y !== -1 &&
  //           light === maxLight &&
  //           ny > chunk.heightmap[cx * size + cz]) ||
  //         chunk.voxels[voxel + fields[key]] >= nl
  //       ) {
  //         return;
  //       }
  //       chunk.voxels[voxel + fields[key]] = nl;
  //       chunk.needsPersistence = true;
  //       queue.push({ x: nx, y: ny, z: nz });
  //     });
  //   }
  // }

  // removeLight(x, y, z, key = "light") {
  //   const { fields, getVoxel, maxHeight, maxLight, voxelNeighbors } = World;
  //   const { chunk, cx, cz } = this.get(x, z);
  //   const voxel = getVoxel(cx, y, cz);
  //   const fill = [];
  //   const queue = [];
  //   queue.push({
  //     x,
  //     y,
  //     z,
  //     light: chunk.voxels[voxel + fields[key]],
  //   });
  //   chunk.voxels[voxel + fields[key]] = 0;
  //   chunk.needsPersistence = true;
  //   const isSunLight = key === "sunlight";
  //   while (queue.length) {
  //     const { x, y, z, light } = queue.shift();
  //     voxelNeighbors.forEach((offset) => {
  //       const ny = y + offset.y;
  //       if (ny < 0 || ny >= maxHeight) {
  //         return;
  //       }
  //       const nx = x + offset.x;
  //       const nz = z + offset.z;
  //       const { chunk, cx, cz } = this.get(nx, nz);
  //       const voxel = getVoxel(cx, ny, cz);
  //       const nl = chunk.voxels[voxel + fields[key]];
  //       if (nl === 0) {
  //         return;
  //       }
  //       if (
  //         nl < light ||
  //         (isSunLight &&
  //           offset.y === -1 &&
  //           light === maxLight &&
  //           nl === maxLight)
  //       ) {
  //         queue.push({
  //           x: nx,
  //           y: ny,
  //           z: nz,
  //           light: nl,
  //         });
  //         chunk.voxels[voxel + fields[key]] = 0;
  //         chunk.needsPersistence = true;
  //       } else if (nl >= light) {
  //         fill.push({
  //           x: nx,
  //           y: ny,
  //           z: nz,
  //         });
  //       }
  //     });
  //   }
  //   this.floodLight(fill, key);
  // }
}
