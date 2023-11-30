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

  for (let i = 0; i < Math.pow(chunkSize, 3); i++) {
    const y = Math.floor(i / (chunkSize * chunkSize));
    const z = Math.floor((i - y * chunkSize * chunkSize) / chunkSize);
    const x = i - y * chunkSize * chunkSize - z * chunkSize;
    const offsetPos = [x + pos.x, y + pos.y, z + pos.z];

    const chunk = chunks[chunkId];
    const underBedrock = pos.y + y < 0;
    if (underBedrock) continue;
    const bedrock = pos.y + y === 0;
    if (bedrock) {
      setVoxel(chunk, i, coal);
      continue;
    }
    if (shouldPlaceBlock(offsetPos)) {
      if (shouldSpawnGold(offsetPos)) {
        setVoxel(chunk, i, gold);
      } else if (shouldSpawnDiamonds(offsetPos)) {
        setVoxel(chunk, i, diamond);
      } else if (shouldSpawnLapis(offsetPos)) {
        setVoxel(chunk, i, lapis);
      } else if (shouldSpawnEmeralds(offsetPos)) {
        setVoxel(chunk, i, emerald);
      } else if (shouldSpawnGrass(offsetPos)) {
        setVoxel(chunk, i, grass);
      } else if (shouldSpawnDirt(offsetPos)) {
        setVoxel(chunk, i, dirt);
      } else {
        setVoxel(chunk, i, stone);
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
