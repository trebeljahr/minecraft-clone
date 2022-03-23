import { expose } from "threads/worker";
import {
  sunlightChunkColumnAt,
  propagateSunlight,
  sunlightChunks,
} from "../chunkLogic/sunlight";
import { floodLight } from "../chunkLogic/floodLight";
import { generateGeometry } from "../chunkLogic/generateGeometry";
import { generateChunkData } from "../chunkLogic/generateData";

const chunkWorker = {
  generateChunkData,
  generateGeometry,
  floodLight,
  propagateSunlight,
  sunlightChunks,
  sunlightChunkColumnAt,
};

expose(chunkWorker);
