import {
  Chunks,
  chunkSize,
  fields,
  neighborOffsets,
  Position,
  terrainHeight,
} from "./constants";
import { computeChunkId, computeVoxelIndex } from "./helpers";
import { Noise } from "./noise";
import { blocks } from "./blocks";
const { birchwood, foliage, oakwood } = blocks;
const noise = new Noise();

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

const minHeight = chunkSize;
const amplitude = 16;

export function getHeightValue(x: number, z: number) {
  return noise.perlin2(x, z) * amplitude * 2 + minHeight;
  // return (
  //   (Math.sin(x / 10) + 1) * (Math.sin(z / 10) + 1) * amplitude + minHeight
  // );
}

let counter = 0;
export function shouldPlaceBlock(pos: number[]) {
  const [x, y, z] = pos;
  // const noiseVal = noise.perlin3(x / 10, y / 10, z / 10);
  // return noiseVal >= -0.25 &&
  // console.log(y);
  const heightValue = getHeightValue(x / 2, z / 2);
  const shouldPlace = y <= heightValue;
  counter++;
  if (shouldPlace && counter % 10000 === 1) {
    console.log("Could place", pos, heightValue);
    // console.log(y, heightValue);
  } else if (counter % 10000 === 1) {
    console.log("Couldn't place", pos, heightValue);
  }
  return shouldPlace;
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
