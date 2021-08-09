import {
  Vector3,
  MathUtils,
  Scene,
  BufferAttribute,
  BufferGeometry,
  Mesh,
} from "three";
import { blocks } from "./blocks";
import {
  copy,
  neighborOffsets,
  terrainHeight,
  transparentBlocks,
  chunkSize,
  maxHeight,
  Position,
  fields,
  maxLight,
  faces,
} from "./constants";
import { opaque } from "./voxelMaterial";
import { Player } from "./Player";
import { Noise } from "./noise";

const {
  cactus,
  emerald,
  lapis,
  diamond,
  birchwood,
  foliage,
  oakwood,
  gold,
  stone,
  grass,
  dirt,
} = blocks;
const noise = new Noise();

const chunkIdToMesh = {};

export class World {
  private chunkSize: number;
  private chunkSliceSize: number;
  public chunks: Record<string, Uint8Array>;
  private tileSize: number;
  private tileTextureWidth: number;
  private tileTextureHeight: number;
  private scene: Scene;
  private sunlightedChunksColumns: Record<string, boolean>;
  constructor(options: {
    chunkSize: number;
    tileSize: number;
    tileTextureWidth: number;
    tileTextureHeight: number;
    scene: Scene;
  }) {
    this.scene = options.scene;
    this.chunkSize = options.chunkSize;
    this.tileSize = options.tileSize;
    this.tileTextureWidth = options.tileTextureWidth;
    this.tileTextureHeight = options.tileTextureHeight;
    const { chunkSize } = this;
    this.chunkSliceSize = chunkSize * chunkSize;
    this.chunks = {};
    this.sunlightedChunksColumns = {};
  }
  computeChunkOffset(pos: Position): Position {
    return this.computeChunkCoordinates(pos).map(
      (coord) => coord * chunkSize
    ) as Position;
  }
  computeChunkCoordinates(pos: Position): Position {
    return pos.map((coord) => coord / chunkSize).map(Math.floor) as Position;
  }
  computeVoxelCoordinates(pos: Vector3) {
    return copy(pos).floor();
  }
  computeVoxelIndex(pos: Position) {
    const { chunkSize, chunkSliceSize } = this;
    const [x, y, z] = pos
      .map((coord) => MathUtils.euclideanModulo(coord, chunkSize))
      .map((value) => value | 0);
    return (y * chunkSliceSize + z * chunkSize + x) * fields.count;
  }
  getChunkForVoxel(pos: Position) {
    return this.chunks[this.computeChunkIndex(pos)];
  }
  computeChunkIndex(pos: Position) {
    return this.computeChunkCoordinates(pos).join(",");
  }
  setVoxel(pos: Position, type: number) {
    let chunk = this.getChunkForVoxel(pos);
    if (!chunk) {
      chunk = this.addChunkForVoxel(pos).chunk;
    }
    const voxelOffset = this.computeVoxelIndex(pos);
    chunk[voxelOffset] = type;
    chunk[voxelOffset + fields.r] = 0;
    chunk[voxelOffset + fields.g] = 0;
    chunk[voxelOffset + fields.b] = 0;
    chunk[voxelOffset + fields.light] = 0;
    chunk[voxelOffset + fields.sunlight] = 0;
  }

  addChunkForVoxel(pos: Position) {
    const chunkId = this.computeChunkIndex(pos);
    let chunk = this.chunks[chunkId];
    if (!chunk) {
      const { chunkSize } = this;
      chunk = new Uint8Array(chunkSize * chunkSize * chunkSize * fields.count);
      this.chunks[chunkId] = chunk;
    }
    return { chunk, chunkId };
  }

  getVoxel(pos: Position) {
    const { chunk } = this.addChunkForVoxel(pos);
    const voxelIndex = this.computeVoxelIndex(pos);
    return {
      type: chunk[voxelIndex],
      light: chunk[voxelIndex + fields.light],
      sunlight: chunk[voxelIndex + fields.sunlight],
    };
  }

  generateGeometryDataForChunk(chunkOffset: Position) {
    const {
      chunkSize: chunkSize,
      tileSize,
      tileTextureWidth,
      tileTextureHeight,
    } = this;
    const positions: number[] = [];
    const lightValues: number[] = [];
    const sunlightValues: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const [startX, startY, startZ] = chunkOffset.map(
      (coord) => coord * chunkSize
    );

    for (let y = 0; y < chunkSize; ++y) {
      const voxelY = startY + y;
      for (let z = 0; z < chunkSize; ++z) {
        const voxelZ = startZ + z;
        for (let x = 0; x < chunkSize; ++x) {
          const voxelX = startX + x;
          const { type: voxel } = this.getVoxel([voxelX, voxelY, voxelZ]);
          if (voxel) {
            const uvVoxel = voxel - 1;
            for (const { dir, corners, uvRow } of faces) {
              const {
                type: neighbor,
                light: neighborLight,
                sunlight: neighbourSunLight,
              } = this.getVoxel([
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

                  lightValues.push(neighborLight);
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
  intersectRay(
    start: Vector3,
    end: Vector3,
    velocity = 6
  ): {
    position: Position;
    normal: Position;
    voxel: number;
  } {
    const {
      x: dx,
      y: dy,
      z: dz,
    } = new Vector3().copy(end).sub(start).normalize();

    let t = 0.0;
    let { x: ix, y: iy, z: iz } = new Vector3().copy(start).floor();

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

    while (t <= velocity) {
      const { type: voxel } = this.getVoxel([ix, iy, iz]);
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
  sunLightChunkAt(pos: Position, callback: () => void) {
    let chunkHasSunlight = this.sunlightedChunksColumns[`${pos[0]} ${pos[2]}`];
    if (!chunkHasSunlight) {
      this.sunlightedChunksColumns[`${pos[0]} ${pos[2]}`] = true;
      const [cx, _, cz] = this.computeChunkOffset(pos);
      const queue = [];
      for (let xOff = 0; xOff < chunkSize; xOff++) {
        for (let zOff = 0; zOff < chunkSize; zOff++) {
          const newPos = [xOff + cx, maxHeight, zOff + cz] as Position;
          this.setLightValue(newPos, 15);
          queue.push(newPos);
        }
      }
      this.floodLight(queue, callback, true);
    }
  }
  setLightValue(pos: Position, lightValue: number) {
    const { chunk } = this.addChunkForVoxel(pos);
    const blockIndex = this.computeVoxelIndex(pos);
    chunk[blockIndex + fields.light] = lightValue;
  }
  floodLight(queue: Position[], callback: () => void, isSunlight = false) {
    const neighbors = [...neighborOffsets].slice(1, neighborOffsets.length);
    const maxPropagations = 50000;
    let propagations = 0;
    while (queue.length > 0) {
      const [x, y, z] = queue.shift();
      const { chunk } = this.addChunkForVoxel([x, y, z]);
      const blockIndex = this.computeVoxelIndex([x, y, z]);
      const blockLightValue = chunk[blockIndex + fields.light];

      neighbors.forEach((offset) => {
        const nx = x + offset.x;
        const ny = y + offset.y;
        const nz = z + offset.z;

        const isGoingDown = offset.y === -1;
        const decrement =
          isSunlight && isGoingDown && blockLightValue === maxLight ? 0 : 1;
        const newLightValue = blockLightValue - decrement;

        const { chunk: neighborsChunk } = this.addChunkForVoxel([nx, ny, nz]);
        const neighborIndex = this.computeVoxelIndex([nx, ny, nz]);
        let lightValueInNeighbor = neighborsChunk[neighborIndex + fields.light];
        let neighborType = neighborsChunk[neighborIndex];

        const shouldPropagate =
          (isSunlight &&
            isGoingDown &&
            blockLightValue === maxLight &&
            ny >= 0 &&
            ny <= maxHeight) ||
          (newLightValue > lightValueInNeighbor && newLightValue > 0);

        if (
          shouldPropagate &&
          transparentBlocks.includes(neighborType) &&
          propagations < maxPropagations
        ) {
          propagations++;
          neighborsChunk[neighborIndex + fields.light] = newLightValue;
          queue.push([nx, ny, nz]);
        }
      });
    }

    callback();
  }
  generateChunkData(pos: Vector3) {
    pos.divideScalar(chunkSize).floor().multiplyScalar(chunkSize);
    for (let y = chunkSize - 1; y >= 0; --y) {
      if (pos.y + y > terrainHeight || pos.y + y <= 0) {
        continue;
      }
      for (let z = 0; z < chunkSize; ++z) {
        for (let x = 0; x < chunkSize; ++x) {
          const offsetPos: Position = [pos.x + x, pos.y + y, pos.z + z];
          if (this.shouldPlaceBlock(...offsetPos)) {
            if (this.shouldSpawnGold(...offsetPos)) {
              this.setVoxel(offsetPos, gold);
            } else if (this.shouldSpawnDiamonds(...offsetPos)) {
              this.setVoxel(offsetPos, diamond);
            } else if (this.shouldSpawnLapis(...offsetPos)) {
              this.setVoxel(offsetPos, lapis);
            } else if (this.shouldSpawnEmeralds(...offsetPos)) {
              this.setVoxel(offsetPos, emerald);
            } else if (this.shouldSpawnGrass(offsetPos)) {
              this.setVoxel(offsetPos, grass);
              if (this.shouldSpawnTree()) {
                this.spawnTree(pos.x + x, pos.y + y + 1, pos.z + z);
              }
            } else if (this.shouldSpawnDirt(...offsetPos)) {
              this.setVoxel(offsetPos, dirt);
            } else {
              this.setVoxel(offsetPos, stone);
            }
          }
        }
      }
    }
  }

  shouldPlaceBlock(x: number, z: number, y: number) {
    const noiseVal = noise.perlin3(x / 10, z / 10, y / 10);
    return noiseVal >= -0.3 && z < terrainHeight;
  }

  wouldPlaceBlockAbove(x: number, currentY: number, z: number) {
    for (let y = currentY + 1; y < currentY + 5; y++) {
      if (this.shouldPlaceBlock(x, y, z)) {
        return true;
      }
    }
    return false;
  }

  shouldSpawnGrass(pos: Position) {
    return !this.wouldPlaceBlockAbove(...pos);
  }

  shouldSpawnLapis(_x: number, currentY: number, _z: number) {
    if (currentY > 40) return false;
    // for (let offset in neighborOffsets) {
    //   getVoxel()
    // }
    return Math.random() < 0.01;
  }

  shouldSpawnDiamonds(_x: number, currentY: number, _z: number) {
    if (currentY > 40) return false;
    // for (let offset in neighborOffsets) {
    //   getVoxel()
    // }
    return Math.random() < 0.01;
  }

  shouldSpawnEmeralds(_x: number, currentY: number, _z: number) {
    if (currentY > 40) return false;
    // for (let offset in neighborOffsets) {
    //   getVoxel()
    // }
    return Math.random() < 0.01;
  }

  shouldSpawnGold(_x: number, currentY: number, _z: number) {
    if (currentY > 40) return false;
    // for (let offset in neighborOffsets) {
    //   getVoxel()
    // }
    return Math.random() < 0.01;
  }

  shouldSpawnDirt(x: number, currentY: number, z: number) {
    for (let y = currentY + 1; y < currentY + 4; y++) {
      if (this.shouldSpawnGrass([x, y, z])) {
        return true;
      }
    }
    return false;
  }

  shouldSpawnTree() {
    return Math.random() < 0.006;
  }

  spawnTree(currentX: number, currentY: number, currentZ: number) {
    const treeHeight = currentY + Math.floor(Math.random() * 3) + 3;
    const leafHeightMin = treeHeight - 2;
    const leafHeightMax = treeHeight + 2;

    const wood = Math.random() > 0.5 ? oakwood : birchwood;

    const leafWidth = 2;

    for (let y = currentY; y < leafHeightMax; y++) {
      if (y >= leafHeightMin && y < treeHeight) {
        for (let x = currentX - leafWidth; x <= currentX + leafWidth; x++) {
          for (let z = currentZ - leafWidth; z <= currentZ + leafWidth; z++) {
            this.setVoxel([x, y, z], foliage);
          }
        }
      } else if (y >= leafHeightMin && y <= treeHeight) {
        for (let x = currentX - 1; x <= currentX + 1; x++) {
          for (let z = currentZ - 1; z <= currentZ + 1; z++) {
            this.setVoxel([x, y, z], foliage);
          }
        }
      } else if (y >= leafHeightMin) {
        this.setVoxel([currentX, y, currentZ], foliage);
        this.setVoxel([currentX, y, currentZ + 1], foliage);
        this.setVoxel([currentX, y, currentZ - 1], foliage);
        this.setVoxel([currentX + 1, y, currentZ], foliage);
        this.setVoxel([currentX - 1, y, currentZ], foliage);
      }
      if (y <= treeHeight) {
        this.setVoxel([currentX, y, currentZ], wood);
      }
    }

    this.updateVoxelGeometry([currentX, leafHeightMax, currentZ]);
    this.updateVoxelGeometry([currentX - leafWidth, leafHeightMax, currentZ]);
    this.updateVoxelGeometry([currentX + leafWidth, leafHeightMax, currentZ]);
    this.updateVoxelGeometry([currentX, leafHeightMax, currentZ - leafWidth]);
    this.updateVoxelGeometry([currentX, leafHeightMax, currentZ + leafWidth]);
  }

  spawnSingleBlock(player: Player) {
    const pos = copy(player.pos);
    this.setVoxel(pos.setX(pos.x + 3).toArray(), 3);
    this.updateVoxelGeometry(pos.toArray());
  }

  updateVoxelGeometry(pos: Position) {
    const updatedChunkIds = {};
    for (const offset of neighborOffsets) {
      const offsetPos = pos.map(
        (coord, i) => coord + offset.toArray()[i]
      ) as Position;
      const chunkId = this.computeChunkIndex(offsetPos);
      if (!updatedChunkIds[chunkId]) {
        updatedChunkIds[chunkId] = true;
        this.updateChunkGeometry(offsetPos);
      }
    }
  }
  hasSunlight(columnId: string) {
    return this.sunlightedChunksColumns[columnId];
  }

  updateChunkGeometry(pos: Position) {
    const chunkCoordinates = this.computeChunkCoordinates(pos);
    const chunkOffset = this.computeChunkOffset(pos);
    const chunkId = this.computeChunkIndex(pos);

    let mesh = chunkIdToMesh[chunkId];
    const geometry = mesh ? mesh.geometry : new BufferGeometry();

    const { positions, normals, uvs, indices, lightValues } =
      this.generateGeometryDataForChunk(chunkCoordinates);
    const positionNumComponents = 3;
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), positionNumComponents)
    );
    const normalNumComponents = 3;
    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(normals), normalNumComponents)
    );
    const uvNumComponents = 2;
    geometry.setAttribute(
      "uv",
      new BufferAttribute(new Float32Array(uvs), uvNumComponents)
    );
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    geometry.setAttribute(
      "light",
      new BufferAttribute(new Float32Array(lightValues), 1)
    );
    geometry.setAttribute(
      "color",
      new BufferAttribute(
        new Float32Array(
          positions.map((_pos) => {
            return 255;
          })
        ),
        3
      )
    );

    if (!mesh) {
      mesh = new Mesh(geometry, opaque);
      mesh.name = chunkId;
      chunkIdToMesh[chunkId] = mesh;
      this.scene.add(mesh);
      mesh.position.set(chunkOffset[0], chunkOffset[1], chunkOffset[2]);
    }
  }
}
