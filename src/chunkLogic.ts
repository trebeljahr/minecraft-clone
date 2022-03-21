import {
  Chunks,
  chunkSize,
  fields,
  Position,
  terrainHeight,
} from "./constants";
import { computeChunkId, computeVoxelIndex } from "./helpers";
import { Noise } from "./noise";
import { blocks } from "./blocks";

const noise = new Noise();
const { birchwood, foliage, oakwood } = blocks;

export function getChunkForVoxel(chunks: Chunks, pos: Position) {
  return chunks[computeChunkId(pos)];
}

export function spawnTree(
  chunks: Chunks,
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
          chunks = setVoxel(chunks, [x, y, z], foliage);
        }
      }
    } else if (y >= leafHeightMin && y <= treeHeight) {
      for (let x = currentX - 1; x <= currentX + 1; x++) {
        for (let z = currentZ - 1; z <= currentZ + 1; z++) {
          chunks = setVoxel(chunks, [x, y, z], foliage);
        }
      }
    } else if (y >= leafHeightMin) {
      chunks = setVoxel(chunks, [currentX, y, currentZ], foliage);
      chunks = setVoxel(chunks, [currentX, y, currentZ + 1], foliage);
      chunks = setVoxel(chunks, [currentX, y, currentZ - 1], foliage);
      chunks = setVoxel(chunks, [currentX + 1, y, currentZ], foliage);
      chunks = setVoxel(chunks, [currentX - 1, y, currentZ], foliage);
    }
    if (y <= treeHeight) {
      chunks = setVoxel(chunks, [currentX, y, currentZ], wood);
    }
  }
  return chunks;

  // this.updateVoxelGeometry([currentX, leafHeightMax, currentZ]);
  // this.updateVoxelGeometry([currentX - leafWidth, leafHeightMax, currentZ]);
  // this.updateVoxelGeometry([currentX + leafWidth, leafHeightMax, currentZ]);
  // this.updateVoxelGeometry([currentX, leafHeightMax, currentZ - leafWidth]);
  // this.updateVoxelGeometry([currentX, leafHeightMax, currentZ + leafWidth]);
}

export function addChunkForVoxel(chunks: Chunks, pos: Position) {
  const chunkId = computeChunkId(pos);
  let chunk = chunks[chunkId];
  if (!chunk) {
    // console.log("Adding new chunk!");
    chunk = new Uint8Array(chunkSize * chunkSize * chunkSize * fields.count);
    chunks[chunkId] = chunk;
  }
  return { chunk, chunkId };
}

export function setVoxel(chunks: Chunks, pos: Position, type: number) {
  let chunk = getChunkForVoxel(chunks, pos);
  if (!chunk) {
    chunk = addChunkForVoxel(chunks, pos).chunk;
  }
  const voxelOffset = computeVoxelIndex(pos);
  chunk[voxelOffset] = type;
  chunk[voxelOffset + fields.r] = 0;
  chunk[voxelOffset + fields.g] = 0;
  chunk[voxelOffset + fields.b] = 0;
  chunk[voxelOffset + fields.light] = 0;
  chunk[voxelOffset + fields.sunlight] = 0;
  return chunks;
}

export function shouldPlaceBlock(pos: Position) {
  const [x, y, z] = pos;
  const noiseVal = noise.perlin3(x / 10, z / 10, y / 10);
  return noiseVal >= -0.3 && z < terrainHeight;
}

export function wouldPlaceBlockAbove(pos) {
  const [x, currentY, z] = pos;
  for (let y = currentY + 1; y < currentY + 5; y++) {
    if (shouldPlaceBlock([x, y, z])) {
      return true;
    }
  }
  return false;
}

export function shouldSpawnGrass(pos: Position) {
  return !wouldPlaceBlockAbove(pos);
}

export function shouldSpawnLapis(pos: Position) {
  const [, currentY] = pos;
  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   getVoxel()
  // }
  return Math.random() < 0.01;
}

export function shouldSpawnDiamonds(pos: Position) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   getVoxel()
  // }
  return Math.random() < 0.01;
}

export function shouldSpawnEmeralds(pos: Position) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   getVoxel()
  // }
  return Math.random() < 0.01;
}

export function shouldSpawnGold(pos: Position) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
  // for (let offset in neighborOffsets) {
  //   getVoxel()
  // }
  return Math.random() < 0.01;
}

export function shouldSpawnDirt(pos: Position) {
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
