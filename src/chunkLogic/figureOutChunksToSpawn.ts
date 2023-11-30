import { Chunks, viewDistance } from "../constants";
import { addOffsetToChunkId } from "../helpers";
import { world } from "../world";

export async function figureOutChunksToSpawn(queue: string[]) {
  const ids = [];
  for (let x = -viewDistance; x <= viewDistance; x++) {
    for (let z = -viewDistance; z <= viewDistance; z++) {
      const offsetId = addOffsetToChunkId(world.lastChunkId, { x, z });
      ids.push(offsetId);
    }
  }
  const chunksToSpawn = ids.filter((offsetId) => {
    return (
      !world.globalChunks[offsetId]?.isGenerated && !queue.includes(offsetId)
    );
  });
  return chunksToSpawn;
}
