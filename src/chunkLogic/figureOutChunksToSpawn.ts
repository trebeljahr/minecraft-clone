import { Chunks, viewDistance } from "../constants";
import { addOffsetToChunkId } from "../helpers";

export async function figureOutChunksToSpawn(
  globalChunks: Chunks,
  queue: string[],
  id: string
) {
  const ids = [];
  for (let x = -viewDistance; x <= viewDistance; x++) {
    for (let z = -viewDistance; z <= viewDistance; z++) {
      const offsetId = addOffsetToChunkId(id, { x, z });
      ids.push(offsetId);
    }
  }
  const chunksToSpawn = ids.filter((offsetId) => {
    return !globalChunks[offsetId] && !queue.includes(offsetId);
  });
  return chunksToSpawn;
}
