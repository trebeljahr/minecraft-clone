import { floodLight } from "../chunkLogic/floodLight";
import { generateGeometry } from "../chunkLogic/generateGeometry";
import { generateChunkData } from "../chunkLogic/generateData";
import { addChunkAtChunkId } from "../helpers";
import { propagateSunlight, createSunlightQueue } from "../chunkLogic/sunlight";

export const ChunkWorkerObject = {
  addChunkAtChunkId,
  generateChunkData,
  generateGeometry,
  floodLight,
  propagateSunlight,
  createSunlightQueue,
};
