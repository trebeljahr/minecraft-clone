import {
  fields,
  copy,
  chunkSize,
  chunkSliceSize,
  Chunks,
  Position,
} from "./constants";
import { MathUtils, Vector3 } from "three";
import { blocksLookup, blocks } from "./blocks";

const { foliage } = blocks;
const leftMouse = 0;
const rightMouse = 2;

export function sleep(timeToSleep: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeToSleep * 1000);
  });
}

export class SimpleTimer {
  public timeStamps: Record<string, number>;
  public lastTimeStamp: string;
  constructor() {
    this.timeStamps = { start: Date.now() };
    this.lastTimeStamp = "start";
  }

  get startTimeStamp() {
    return this.timeStamps["start"];
  }

  takenFor(name: string) {
    const stamp = Date.now();
    this.timeStamps[name] = stamp;
    const timeTaken = stamp - this.timeStamps[this.lastTimeStamp];
    console.log(`Time taken for ${name}: ${timeTaken / 1000}s`);
    this.lastTimeStamp = name;
  }

  stop(now = "now", since = "start") {
    const stamp = Date.now();
    this.timeStamps[now] = stamp;
    this.lastTimeStamp = now;
    console.log(
      `Time taken from ${since} to ${now} was ${stamp - this.timeStamps[since]}`
    );
  }
}

export class MouseClickEvent {
  public event: MouseEvent;
  constructor(event: MouseEvent) {
    this.event = event;
  }
  get left() {
    return this.event.button === leftMouse;
  }
  get right() {
    return this.event.button === rightMouse;
  }
}

export function getLightValue(chunks: Chunks, pos: Position) {
  const { addedChunk: chunk } = addChunkForVoxel(chunks, pos);
  const blockIndex = computeVoxelIndex(pos);
  const blockLightValue = chunk[blockIndex + fields.light];
  return blockLightValue;
}

export function computeChunkDistanceFromPoint(
  point: Position,
  chunkId: string
) {
  // console.log(chunkId.split(",").map((elem) => parseInt(elem)));
  const chunkPos = new Vector3(
    ...chunkId.split(",").map((elem) => parseInt(elem))
  );
  const pos = new Vector3(...getChunkCoordinates(point));
  // console.log(pos);
  const distance = chunkPos.distanceTo(pos);
  // console.log("Distance from point", distance);
  return distance;
}

export function setLightValue(
  chunks: Chunks,
  pos: Position,
  lightValue: number
) {
  const { addedChunk: chunk } = addChunkForVoxel(chunks, pos);
  const blockIndex = computeVoxelIndex(pos);
  chunk[blockIndex + fields.light] = lightValue;
}

export function addChunkForVoxel(chunks: Chunks, pos: Position) {
  const chunkId = computeChunkId(pos);
  let chunk = chunks[chunkId];
  if (!chunk) {
    chunk = new Uint8Array(chunkSize * chunkSize * chunkSize * fields.count);
    chunks[chunkId] = chunk;
  }
  return { addedChunk: chunk, addedChunkId: chunkId };
}

export function computeVoxelIndex(pos: number[]) {
  const [x, y, z] = pos
    .map((coord) => MathUtils.euclideanModulo(coord, chunkSize))
    .map((value) => value | 0);
  return (y * chunkSliceSize + z * chunkSize + x) * fields.count;
}

// export function getSurroundingChunksColumns(chunks: Chunks, pos: Position) {
//   let filteredChunks = {};
//   for (let x = -1; x < 1; x++) {
//     for (let z = -1; z < 1; z++) {
//       filteredChunks = { ...filteredChunks, ...getChunkColumn(chunks, pos) };
//     }
//   }
//   return filteredChunks;
// }

export function getChunkColumn(chunks: Chunks, pos: Position) {
  // console.log(pos);
  // console.log(computeChunkId(pos));
  const chunkEntries = Object.entries(chunks);
  const filteredEntries = chunkEntries.filter(([chunkId]) => {
    const chunkPosition = parseChunkId(chunkId);
    const posOffset = computeChunkOffsetVector(pos);
    const sameX = chunkPosition.x === posOffset.x;
    const sameZ = chunkPosition.z === posOffset.z;
    if (sameX && sameZ) {
      return true;
    }
    return false;
  });
  // console.log(filteredEntries);
  return Object.fromEntries(filteredEntries);
}

export function computeChunkOffsetVector(pos: Position) {
  return new Vector3(...getSmallChunkCorner(pos));
}

export function getSmallChunkCorner(pos: Position): Position {
  return getChunkCoordinates(pos).map((coord) => coord * chunkSize) as Position;
}

export function getBigChunkCorner(pos: Position): Position {
  return getSmallChunkCorner(pos).map(
    (coord) => coord + chunkSize - 1
  ) as Position;
}

export function computeSmallChunkCornerFromId(chunkId: string): Position {
  return getChunkCoordinatesFromId(chunkId).map(
    (coord) => coord * chunkSize
  ) as Position;
}

export const byBlockData = (_: number, index: number) =>
  index % fields.count === 0;

export function transformToBlocks(chunk: Uint8Array) {
  return [...chunk].filter(byBlockData).map((num) => {
    return blocksLookup[num];
  });
}

export const toBlock = (block: number) => (num, index) => {
  if (index % fields.count === 0) {
    return block;
  }
  return num;
};

export function generateSurroundingChunks(chunks: Chunks, id: string) {
  for (let xOff = -1; xOff <= 1; xOff++) {
    for (let zOff = -1; zOff <= 1; zOff++) {
      for (let yOff = -1; yOff <= 1; yOff++) {
        const [x, y, z] = getChunkCoordinatesFromId(id);
        const newChunkId = `${x + xOff}, ${y + yOff}, ${z + zOff}`;
        if (!chunks[newChunkId]) {
          chunks[newChunkId] = new Uint8Array(
            chunkSize * chunkSize * chunkSize * fields.count
          );
        }
      }
    }
  }
  return chunks;
}

export function addChunkAtChunkId(chunks: Chunks, id: string) {
  chunks[id] = new Uint8Array(chunkSize * chunkSize * chunkSize * fields.count);
  chunks = generateSurroundingChunks(chunks, id);
  return chunks;
}

export function getChunkCoordinatesFromId(chunkId: string) {
  return chunkId.split(",").map((num) => parseInt(num));
}

export function computeChunkId(pos: number[]) {
  return getChunkCoordinates(pos).join(",");
}

export function parseChunkId(chunkId: string) {
  const [x, y, z] = chunkId.split(",").map((digits) => parseInt(digits));
  return new Vector3(x, y, z).multiplyScalar(chunkSize);
}

export function getChunkCoordinates(pos: number[]): Position {
  return pos.map((coord) => coord / chunkSize).map(Math.floor) as Position;
}

export function computeVoxelCoordinates(pos: Vector3) {
  return copy(pos).floor();
}

export function getVoxel(chunks: Chunks, pos: Position) {
  const chunkId = computeChunkId(pos);
  const chunk = chunks[chunkId];
  if (!chunk) {
    return {
      type: 0,
      light: 0,
      sunlight: 0,
    };
  }
  const voxelIndex = computeVoxelIndex(pos);
  return {
    type: chunk[voxelIndex],
    light: chunk[voxelIndex + fields.light],
    sunlight: chunk[voxelIndex + fields.sunlight],
  };
}
