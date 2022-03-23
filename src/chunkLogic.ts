import {
  Chunk,
  Chunks,
  chunkSize,
  fields,
  Position,
  terrainHeight,
} from "./constants";
import {
  computeChunkId,
  computeChunkOffsetVector,
  computeVoxelIndex,
  parseChunkId,
} from "./helpers";
import { Noise } from "./noise";
import { blocks } from "./blocks";
import { Vector3 } from "three";
const {
  emerald,
  lapis,
  diamond,
  gold,
  stone,
  grass,
  dirt,
  birchwood,
  foliage,
  oakwood,
} = blocks;
const noise = new Noise();

export function generateChunkData(chunk: Chunk, chunkId: string) {
  const pos = parseChunkId(chunkId);
  for (let y = chunkSize - 1; y >= 0; y--) {
    const underBedrock = pos.y + y <= 0;
    const overMaximumHeight = pos.y + y > terrainHeight;
    if (overMaximumHeight || underBedrock) continue;

    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const offsetPos: Position = [pos.x + x, pos.y + y, pos.z + z];
        // if (offsetPos.length !== 3) return;
        if (shouldPlaceBlock([...offsetPos])) {
          if (shouldSpawnGold([...offsetPos])) {
            chunk.data = setVoxel(chunk.data, [...offsetPos], gold);
          } else if (shouldSpawnDiamonds([...offsetPos])) {
            chunk.data = setVoxel(chunk.data, [...offsetPos], diamond);
          } else if (shouldSpawnLapis([...offsetPos])) {
            chunk.data = setVoxel(chunk.data, [...offsetPos], lapis);
          } else if (shouldSpawnEmeralds([...offsetPos])) {
            chunk.data = setVoxel(chunk.data, [...offsetPos], emerald);
          } else if (shouldSpawnGrass([...offsetPos])) {
            chunk.data = setVoxel(chunk.data, [...offsetPos], grass);
            // if (shouldSpawnTree()) {
            //   chunk.data = spawnTree(chunk.data, pos.x + x, pos.y + y + 1, pos.z + z);
            // }
          } else if (shouldSpawnDirt([...offsetPos])) {
            chunk.data = setVoxel(chunk.data, [...offsetPos], dirt);
          } else {
            chunk.data = setVoxel(chunk.data, [...offsetPos], stone);
          }
        }
      }
    }
  }
  chunk.isGenerated = true;
  return chunk;
}

export function getChunkForVoxel(
  chunks: Chunks,
  pos: number[]
): [Uint8Array, string] {
  const chunkId = computeChunkId(pos as Position);
  const foundChunk = chunks[chunkId]?.data;
  return [foundChunk, chunkId];
}

export function spawnTree(
  chunk: Uint8Array,
  currentX: number,
  currentY: number,
  currentZ: number
) {
  const treeHeight = currentY + Math.floor(Math.random() * 3) + 3;
  const leafHeightMin = treeHeight - 2;
  const leafHeightMax = treeHeight + 2;

  const wood = Math.random() > 0.5 ? oakwood : birchwood;

  const leafWidth = 2;

  for (let y = currentY; y < leafHeightMax; y++) {
    if (y >= leafHeightMin && y < treeHeight) {
      for (let x = currentX - leafWidth; x <= currentX + leafWidth; x++) {
        for (let z = currentZ - leafWidth; z <= currentZ + leafWidth; z++) {
          chunk = setVoxel(chunk, [x, y, z], foliage);
        }
      }
    } else if (y >= leafHeightMin && y <= treeHeight) {
      for (let x = currentX - 1; x <= currentX + 1; x++) {
        for (let z = currentZ - 1; z <= currentZ + 1; z++) {
          chunk = setVoxel(chunk, [x, y, z], foliage);
        }
      }
    } else if (y >= leafHeightMin) {
      chunk = setVoxel(chunk, [currentX, y, currentZ], foliage);
      chunk = setVoxel(chunk, [currentX, y, currentZ + 1], foliage);
      chunk = setVoxel(chunk, [currentX, y, currentZ - 1], foliage);
      chunk = setVoxel(chunk, [currentX + 1, y, currentZ], foliage);
      chunk = setVoxel(chunk, [currentX - 1, y, currentZ], foliage);
    }
    if (y <= treeHeight) {
      chunk = setVoxel(chunk, [currentX, y, currentZ], wood);
    }
  }
  return chunk;

  // this.updateVoxelGeometry([currentX, leafHeightMax, currentZ]);
  // this.updateVoxelGeometry([currentX - leafWidth, leafHeightMax, currentZ]);
  // this.updateVoxelGeometry([currentX + leafWidth, leafHeightMax, currentZ]);
  // this.updateVoxelGeometry([currentX, leafHeightMax, currentZ - leafWidth]);
  // this.updateVoxelGeometry([currentX, leafHeightMax, currentZ + leafWidth]);
}

export function setVoxel(chunk: Uint8Array, pos: number[], type: number) {
  const voxelOffset = computeVoxelIndex(pos);
  chunk[voxelOffset] = type;
  chunk[voxelOffset + fields.r] = 0;
  chunk[voxelOffset + fields.g] = 0;
  chunk[voxelOffset + fields.b] = 0;
  chunk[voxelOffset + fields.light] = 0;
  chunk[voxelOffset + fields.sunlight] = 0;
  return chunk;
}

export function shouldPlaceBlock(pos: number[]) {
  const [x, y, z] = pos;
  const noiseVal = noise.perlin3(x / 10, y / 10, z / 10);
  return noiseVal >= -0.3 && y < terrainHeight;
}

export function wouldPlaceBlockAbove(pos: number[]) {
  const [x, currentY, z] = pos;
  for (let y = currentY + 1; y < currentY + 5; y++) {
    if (shouldPlaceBlock([x, y, z])) {
      return true;
    }
  }
  return false;
}

export function shouldSpawnGrass(pos: number[]) {
  return !wouldPlaceBlockAbove(pos);
}

export function shouldSpawnLapis(pos: number[]) {
  const [, currentY] = pos;
  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   getVoxel()
  // }
  return Math.random() < 0.01;
}

export function shouldSpawnDiamonds(pos: number[]) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   getVoxel()
  // }
  return Math.random() < 0.01;
}

export function shouldSpawnEmeralds(pos: number[]) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   getVoxel()
  // }
  return Math.random() < 0.01;
}

export function shouldSpawnGold(pos: number[]) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   getVoxel()
  // }
  return Math.random() < 0.01;
}

export function shouldSpawnDirt(pos: number[]) {
  const [x, currentY, z] = pos;

  for (let y = currentY + 1; y < currentY + 4; y++) {
    if (shouldSpawnGrass([x, y, z])) {
      return true;
    }
  }
  return false;
}

export function shouldSpawnTree() {
  return Math.random() < 0.006;
}
