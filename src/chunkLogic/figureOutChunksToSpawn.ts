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
      //   console.log("OffsetID", offsetId);
      //   console.log("id", id);
      // const distance = getDistanceBetweenChunks(id, offsetId);
      // if (distance >= viewDistance) {
      ids.push(offsetId);
      // }
    }
  }
  // console.log(ids);
  // console.log(Object.keys(globalChunks));
  // console.log(Object.keys(globalChunks));

  // console.log("Before filtering queue", queue.length);
  // console.log("Before filtering global", Object.keys(globalChunks).length);
  const chunksToSpawn = ids.filter((offsetId) => {
    return !globalChunks[offsetId] && !queue.includes(offsetId);
  });
  return chunksToSpawn;
}
