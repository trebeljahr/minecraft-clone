import {
  Chunks,
  chunkSize,
  fields,
  neighborOffsets,
  Position,
  terrainHeight,
} from "./constants";
import { computeChunkId, computeVoxelIndex } from "./helpers";
import { perlin2, perlin3 } from "./noise";
import { blocks } from "./blocks";
const { birchwood, foliage, oakwood } = blocks;

export function getChunkForVoxel(
  chunks: Chunks,
  pos: number[]
): [Uint8Array, string] {
  const chunkId = computeChunkId(pos as Position);
  const foundChunk = chunks[chunkId]?.data;
  return [foundChunk, chunkId];
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
}

export function updateVoxelGeometry(pos: Position) {
  const updatedChunkIds = {};
  for (const offset of neighborOffsets) {
    const offsetPos = pos.map(
      (coord, i) => coord + offset.toArray()[i]
    ) as Position;
    const chunkId = computeChunkId(offsetPos);
    if (!updatedChunkIds[chunkId]) {
      updatedChunkIds[chunkId] = true;
    }
  }
}

export function setVoxel(chunks: Chunks, pos: number[], type: number) {
  const chunkId = computeChunkId(pos);
  const voxelOffset = computeVoxelIndex(pos);
  try {
    chunks[chunkId].data[voxelOffset] = type;
    chunks[chunkId].data[voxelOffset + fields.r] = 0;
    chunks[chunkId].data[voxelOffset + fields.g] = 0;
    chunks[chunkId].data[voxelOffset + fields.b] = 0;
    chunks[chunkId].data[voxelOffset + fields.light] = 0;
    chunks[chunkId].data[voxelOffset + fields.sunlight] = 0;
  } catch (err) {
    console.log(pos, chunks, chunkId);
    throw err;
  }
  return chunks;
}

const minHeight = chunkSize * 2;
const amplitude = 16;
const roughness = 0.05;

export function getHeightValue(x: number, z: number) {
  return perlin2(x * roughness, z * roughness) * amplitude * 2 + minHeight;
}

export function shouldPlaceBlock(pos: number[]) {
  const [x, y, z] = pos;
  const noiseVal = perlin3(x / 10, y / 10, z / 10);
  const heightValue = getHeightValue(x, z);
  const shouldPlace = y <= heightValue;
  return noiseVal >= -0.25 && shouldPlace;
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
  return Math.random() < 0.01;
}

export function shouldSpawnDiamonds(pos: number[]) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
  return Math.random() < 0.01;
}

export function shouldSpawnEmeralds(pos: number[]) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
  return Math.random() < 0.01;
}

export function shouldSpawnGold(pos: number[]) {
  const [, currentY] = pos;

  if (currentY > 40) return false;
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
