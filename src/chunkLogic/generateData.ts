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
import { Chunk, chunkSize, Position } from "../constants";
import { parseChunkId } from "../helpers";
import { blocks } from "../blocks";
const { emerald, lapis, diamond, gold, stone, grass, dirt } = blocks;

export async function generateChunkData(chunk: Chunk, chunkId: string) {
  const pos = parseChunkId(chunkId);
  for (let y = chunkSize - 1; y >= 0; y--) {
    const underBedrock = pos.y + y <= 0;
    if (underBedrock) continue;

    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const offsetPos: Position = [pos.x + x, pos.y + y, pos.z + z];
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
            if (shouldSpawnTree()) {
              chunk.data = spawnTree(
                chunk.data,
                pos.x + x,
                pos.y + y + 1,
                pos.z + z
              );
            }
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
