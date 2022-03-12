import { spawn, Pool, Worker } from "threads";

export const chunkGeometryWorkerPool = Pool(
  () => spawn(new Worker("./chunkGeometryWorker")),
  8
);

export const sunlightWorkerPool = Pool(
  () => spawn(new Worker("./sunlightWorker")),
  8
);

export const floodLightWorkerPool = Pool(
  () => spawn(new Worker("./floodLightWorker")),
  8
);
