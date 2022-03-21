import { Vector3, Scene, BufferAttribute, BufferGeometry, Mesh } from "three";
import {
  computeChunkId,
  computeVoxelIndex,
  computeChunkOffset,
  computeChunkCoordinates,
  getVoxel,
  addChunkForVoxel,
} from "./helpers";
import { blocks } from "./blocks";
import {
  copy,
  neighborOffsets,
  terrainHeight,
  chunkSize,
  Position,
  fields,
  Chunks,
} from "./constants";
import { opaque } from "./voxelMaterial";
import { Player } from "./Player";
import { chunkGeometryWorkerPool } from "./workers/workerPool";
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
} from "./chunkLogic";

const { birchwood, foliage, oakwood } = blocks;

const chunkIdToMesh = {};

export class World {
  public chunks: Chunks;
  private scene: Scene;
  private sunlightedChunksColumns: Record<string, boolean>;
  constructor(options: {
    tileSize: number;
    tileTextureWidth: number;
    tileTextureHeight: number;
    scene: Scene;
  }) {
    this.scene = options.scene;
    this.chunks = {};
    this.sunlightedChunksColumns = {};
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

    let txMax = txDelta < Infinity ? txDelta * xDist : Infinity;
    let tyMax = tyDelta < Infinity ? tyDelta * yDist : Infinity;
    let tzMax = tzDelta < Infinity ? tzDelta * zDist : Infinity;

    let steppedIndex = -1;

    while (t <= velocity) {
      const { type: voxel } = getVoxel(this.chunks, [ix, iy, iz]);
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

  setLightValue(pos: Position, lightValue: number) {
    const { chunk } = this.addChunkForVoxel(pos);
    const blockIndex = computeVoxelIndex(pos);
    chunk[blockIndex + fields.light] = lightValue;
  }

  setVoxel(pos: Position, type: number) {
    this.chunks = setVoxel(this.chunks, pos, type);
  }

  addChunkForVoxel(pos: Position) {
    const { addedChunk, addedChunkId } = addChunkForVoxel(this.chunks, pos);
    this.chunks[addedChunkId] = addedChunk;
    return { chunk: addedChunk, chunkId: addedChunkId };
  }

  async generateChunkData(posVector: Vector3) {
    await chunkGeometryWorkerPool.queue(async (worker) => {
      const pos = posVector.toArray() as Position;
      this.chunks = await worker.generateChunkData(this.chunks, pos);
    });
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
      const chunkId = computeChunkId(offsetPos);
      if (!updatedChunkIds[chunkId]) {
        updatedChunkIds[chunkId] = true;
        this.updateChunkGeometry(offsetPos);
      }
    }
  }

  hasSunlight(columnId: string) {
    return this.sunlightedChunksColumns[columnId];
  }

  async updateChunkGeometry(pos: Position) {
    const chunkCoordinates = computeChunkCoordinates(pos);
    const chunkOffset = computeChunkOffset(pos);
    const chunkId = computeChunkId(pos);

    let mesh = chunkIdToMesh[chunkId];
    const geometry = mesh ? mesh.geometry : new BufferGeometry();

    await chunkGeometryWorkerPool.queue(async (worker) => {
      const { positions, normals, uvs, indices, lightValues } =
        await worker.generateGeometry(this.chunks, chunkCoordinates);

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
            positions.map(() => {
              return 255;
            })
          ),
          3
        )
      );
    });

    if (!mesh) {
      mesh = new Mesh(geometry, opaque);
      mesh.name = chunkId;
      // console.log("Chunk Id in scene: ", chunkId);
      chunkIdToMesh[chunkId] = mesh;
      this.scene.add(mesh);
      mesh.position.set(chunkOffset[0], chunkOffset[1], chunkOffset[2]);
    }
  }
}
