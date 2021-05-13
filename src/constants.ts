import { chunkSize } from "./createChunk";

export const surface = 5 * chunkSize;
export const terrainHeight = surface + 10;
export const blockLength = 100;

import * as THREE from "three";

export function copy(vec: THREE.Vector3) {
  return new THREE.Vector3().copy(vec);
}

// function cameraDirection() {
//   const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
//   const x = (pos.x / window.innerWidth) * 2 - 1;
//   const y = (pos.y / window.innerHeight) * -2 + 1; // note we flip Y
//   const start = new Vector3();
//   const end = new Vector3();
//   start.setFromMatrixPosition(camera.matrixWorld);
//   end.set(x, y, 1).unproject(camera);
//   const direction = new Vector3().copy(end).sub(start).normalize();
//   return direction;
// }

// function generateChunksInMovementDirection() {
//   const dir = getCurrentChunk().sub(lastChunk);
//   console.log("Direction", dir);

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

// function getCurrentChunk(providedPos?: Vector3) {
//   const pos = providedPos || player.position;
//   return copy(pos).divideScalar(chunkSize).floor();
// }
