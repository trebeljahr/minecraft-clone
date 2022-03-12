import { spawn, Pool, Worker } from "threads";

const size = 8;
export const chunkGeometryWorkerPool = Pool(
  () => spawn(new Worker("./chunkGeometryWorker")),
  size
);
