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
import { Chunks, chunkSize, Position } from "../constants";
import { getVoxel, parseChunkId } from "../helpers";
import { blocks } from "../blocks";
const { emerald, lapis, diamond, gold, coal, stone, grass, dirt } = blocks;

export async function growTrees(chunks: Chunks, chunkId: string) {
  const pos = parseChunkId(chunkId);
  for (let y = 0; y < chunkSize; y++) {
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const newPos: Position = [x + pos.x, y + pos.y, z + pos.z];
        const { type } = getVoxel(chunks, newPos);
        if (type === grass && shouldSpawnTree()) {
          chunks = spawnTree(chunks, ...newPos);
        }
      }
    }
  }
  return chunks;
}

export async function generateChunkData(chunks: Chunks, chunkId: string) {
  if (Object.keys(chunks).length === 0) {
    throw Error("No chunks?");
  }
  const pos = parseChunkId(chunkId);
  // console.log(pos);

  for (let y = chunkSize - 1; y >= 0; y--) {
    const underBedrock = pos.y + y < 0;
    if (underBedrock) continue;

    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const offsetPos: Position = [pos.x + x, pos.y + y, pos.z + z];
        const bedrock = pos.y + y === 0;
        if (bedrock) {
          chunks = setVoxel(chunks, [...offsetPos], coal);
          continue;
        }
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
          } else if (shouldSpawnDirt([...offsetPos])) {
            chunks = setVoxel(chunks, [...offsetPos], dirt);
          } else {
            chunks = setVoxel(chunks, [...offsetPos], stone);
          }
        }
      }
    }
  }
  try {
    chunks[chunkId].isGenerated = true;
  } catch (err) {
    console.log(chunks, chunkId);
    throw err;
  }
  return chunks;
}
