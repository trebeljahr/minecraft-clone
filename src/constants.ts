import { blocks } from "./blocks";
export const chunkSize = 16;
export const halfChunk = chunkSize / 2;
export const chunkSliceSize = chunkSize * chunkSize;
export const surface = 5 * chunkSize;
export const terrainHeight = surface;
export const blockLength = 100;

import * as THREE from "three";
import { Vector3 } from "three";

export type Position = [number, number, number];
export function copy(vec: THREE.Vector3) {
  return new THREE.Vector3().copy(vec);
}
export const maxHeight = terrainHeight + chunkSize / 2;

export const tileSize = 16;
export const tileTextureWidth = 320;
export const tileTextureHeight = 48;

const { air, cactus, foliage } = blocks;

export const neighborOffsets = [
  new Vector3(0, 0, 0), // self
  new Vector3(-1, 0, 0), // left
  new Vector3(1, 0, 0), // right
  new Vector3(0, -1, 0), // down
  new Vector3(0, 1, 0), // up
  new Vector3(0, 0, -1), // back
  new Vector3(0, 0, 1), // front
];

let surroundingOffsets = [] as Position[];

for (let z = -1; z <= 1; z++) {
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      surroundingOffsets.push([x, y, z]);
    }
  }
}

export { surroundingOffsets };

const sum = (a: number, b: number) => a + b;
export const surroundingOffsetsWithoutSelf = surroundingOffsets.filter(
  (coords) => {
    return coords.map(Math.abs).reduce(sum, 0) > 0;
  }
);

export const glowingBlocks = [cactus];
export const transparentBlocks = [air, cactus, foliage];

export const maxLight = 15;
export const fields = {
  r: 1,
  g: 2,
  b: 3,
  light: 4,
  sunlight: 5,
  count: 6,
};
export const faces = [
  {
    // left
    uvRow: 1,
    dir: [-1, 0, 0],
    corners: [
      { pos: [0, 1, 0], uv: [0, 1] },
      { pos: [0, 0, 0], uv: [0, 0] },
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [0, 0, 1], uv: [1, 0] },
    ],
  },
  {
    // right
    uvRow: 1,
    dir: [1, 0, 0],
    corners: [
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [1, 1, 0], uv: [1, 1] },
      { pos: [1, 0, 0], uv: [1, 0] },
    ],
  },
  {
    // bottom
    uvRow: 2,
    dir: [0, -1, 0],
    corners: [
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [1, 1] },
      { pos: [0, 0, 0], uv: [0, 1] },
    ],
  },
  {
    // top
    uvRow: 0,
    dir: [0, 1, 0],
    corners: [
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 0] },
    ],
  },
  {
    // back
    uvRow: 1,
    dir: [0, 0, -1],
    corners: [
      { pos: [1, 0, 0], uv: [0, 0] },
      { pos: [0, 0, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 1] },
    ],
  },
  {
    // front
    uvRow: 1,
    dir: [0, 0, 1],
    corners: [
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 1, 1], uv: [0, 1] },
      { pos: [1, 1, 1], uv: [1, 1] },
    ],
  },
];

export type Chunks = Record<string, Uint8Array>;
// function getCurrentChunk(providedPos?: Vector3) {
//   const pos = providedPos || player.position;
//   return copy(pos).divideScalar(chunkSize).floor();
// }
// function generateChunksInMovementDirection() {
//   const currentChunk = getCurrentChunk();
//   if (lastChunk === currentChunk) return;
//   lastChunk = currentChunk;
//   const dir = currentChunk.sub(lastChunk);

//   var axis = new Vector3(0, 1, 0);
//   var angle = Math.PI / 2;

//   const rotatedOffset = copy(dir)
//     .applyAxisAngle(axis, angle)
//     .multiplyScalar(chunkSize);

//   const offset = dir
//     .multiplyScalar(chunkSize)
//     .add(new Vector3(0, -chunkSize, 0));
//   const newPos = player.position.add(offset);
//   generateChunkAtPosition(newPos);
//   generateChunkAtPosition(copy(newPos).add(rotatedOffset));
//   generateChunkAtPosition(copy(newPos).sub(rotatedOffset));
// }
