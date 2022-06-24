import { floodLight } from "../chunkLogic/floodLight";
import { generateGeometry } from "../chunkLogic/generateGeometry";
import { generateChunkData } from "../chunkLogic/generateData";
import { propagateSunlight, createSunlightQueue } from "../chunkLogic/sunlight";

export const ChunkWorkerObject = {
  generateChunkData,
  generateGeometry,
  floodLight,
  propagateSunlight,
  createSunlightQueue,
};
