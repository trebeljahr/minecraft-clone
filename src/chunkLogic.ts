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

export function generateChunkData(chunks: Chunks, posArray: number[]) {
  // console.log(chunks);
  // console.log(posArray);
  const pos = new Vector3(...posArray)
    .divideScalar(chunkSize)
    .floor()
    .multiplyScalar(chunkSize);
  for (let y = chunkSize - 1; y >= 0; y--) {
    // console.log("y-offset", y);
    const underBedrock = pos.y + y <= 0;
    const overMaximumHeight = pos.y + y > terrainHeight;
    if (overMaximumHeight || underBedrock) continue;

    for (let z = 0; z < chunkSize; z++) {
      // console.log("z-offset", z);
      for (let x = 0; x < chunkSize; x++) {
        // console.log("x-offset", x);

        const offsetPos: Position = [pos.x + x, pos.y + y, pos.z + z];
        const chunkId = computeChunkId(offsetPos);
        const foundChunk = chunks[chunkId];
        if (!foundChunk) {
          console.log("Searching: ", Object.keys(chunks));
          console.log("Original position", pos);
          console.log("Offset", { x, y, z });
          console.log("Pos with offset", offsetPos, "at id:", chunkId);
          console.log("Found:", foundChunk);
          console.error("Not found chunk");
        }
        // if (offsetPos.length !== 3) return;
        if (shouldPlaceBlock([...offsetPos])) {
          if (shouldSpawnGold([...offsetPos])) {
            chunks = setVoxel(chunks, [...offsetPos], gold);
          } else if (shouldSpawnDiamonds([...offsetPos])) {
            chunks = setVoxel(chunks, [...offsetPos], diamond);
          } else if (shouldSpawnLapis([...offsetPos])) {
            chunks = setVoxel(chunks, [...offsetPos], lapis);
          } else if (shouldSpawnEmeralds([...offsetPos])) {
            chunks = setVoxel(chunks, [...offsetPos], emerald);
          } else if (shouldSpawnGrass([...offsetPos])) {
            chunks = setVoxel(chunks, [...offsetPos], grass);
            // if (shouldSpawnTree()) {
            //   chunks = spawnTree(chunks, pos.x + x, pos.y + y + 1, pos.z + z);
            // }
          } else if (shouldSpawnDirt([...offsetPos])) {
            chunks = setVoxel(chunks, [...offsetPos], dirt);
          } else {
            chunks = setVoxel(chunks, [...offsetPos], stone);
          }
        }
      }
    }
  }
  return chunks;
}

export function getChunkForVoxel(chunks: Chunks, pos: number[]) {
  const chunkId = computeChunkId(pos as Position);
  const foundChunk = chunks[chunkId];
  //   if (!foundChunk) {
  //     console.log("Searching: ", Object.keys(chunks));
  //     console.log("For pos", pos, "at id:", chunkId);
  //     console.log("Found:", foundChunk);
  //     console.error("Not found chunk");
  //   }
  return foundChunk;
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

export function setVoxel(chunks: Chunks, pos: number[], type: number) {
  let chunk = getChunkForVoxel(chunks, pos);
  //   if (!chunk) {
  //     chunk = addChunkForVoxel(chunks, pos).chunk;
  //   }
  //   if (!chunk) return chunks;
  //   try {
  const voxelOffset = computeVoxelIndex(pos);
  chunk[voxelOffset] = type;
  chunk[voxelOffset + fields.r] = 0;
  chunk[voxelOffset + fields.g] = 0;
  chunk[voxelOffset + fields.b] = 0;
  chunk[voxelOffset + fields.light] = 0;
  chunk[voxelOffset + fields.sunlight] = 0;
  //   } catch (err) {
  //     console.log("Caught the setting error!");
  //     console.log(chunks);
  //     console.log(chunk);
  //     console.log(pos);
  //   }

  return chunks;
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
