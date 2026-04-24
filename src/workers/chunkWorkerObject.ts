import { floodLight } from "../chunkLogic/floodLight";
import { generateChunkData, growTrees } from "../chunkLogic/generateData";
import { generateGeometry } from "../chunkLogic/generateGeometry";
import { createSunlightQueue, propagateSunlight } from "../chunkLogic/sunlight";

export const ChunkWorkerObject = {
  generateChunkData,
  growTrees,
  generateGeometry,
  floodLight,
  propagateSunlight,
  createSunlightQueue,
};
