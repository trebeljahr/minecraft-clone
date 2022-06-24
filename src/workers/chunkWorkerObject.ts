import { floodLight } from "../chunkLogic/floodLight";
import { generateGeometry } from "../chunkLogic/generateGeometry";
import { generateChunkData, growTrees } from "../chunkLogic/generateData";
import { propagateSunlight, createSunlightQueue } from "../chunkLogic/sunlight";

export const ChunkWorkerObject = {
  generateChunkData,
  growTrees,
  generateGeometry,
  floodLight,
  propagateSunlight,
  createSunlightQueue,
};
