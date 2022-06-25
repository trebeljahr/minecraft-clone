import { PerspectiveCamera, Vector3 } from "three";
import { blocks } from "./blocks";
import { setVoxel } from "./chunkLogic";
import { Chunks, glowingBlocks, neighborOffsets, Position } from "./constants";
import {
  computeChunkId,
  getSurroundingChunksColumns,
  getVoxel,
  MouseClickEvent,
  setLightValue,
} from "./helpers";
import { intersectRay, Intersection } from "./intersectRay";
import { Inventory } from "./inventory";
import { Player } from "./Player";
import {
  mergeChunkUpdates,
  pickSurroundingChunks,
  sunlightChunks,
  updateSurroundingChunkGeometry,
} from "./streamChunks";
import { chunkWorkerPool } from "./workers/workerPool";

const { air } = blocks;

export function getIntersection(
  mouseClick: MouseClickEvent,
  camera: PerspectiveCamera,
  globalChunks: Chunks
) {
  if (!(mouseClick.right || mouseClick.left)) return;

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const x = (pos.x / window.innerWidth) * 2 - 1;
  const y = (pos.y / window.innerHeight) * -2 + 1;

  const start = new Vector3();
  const end = new Vector3();
  start.setFromMatrixPosition(camera.matrixWorld);
  end.set(x, y, 1).unproject(camera);

  const intersection = intersectRay(globalChunks, start, end);
  return intersection;
}

export function areSame(a: any[], b: any[]) {
  return (
    a.every((item) => b.includes(item)) && b.every((item) => a.includes(item))
  );
}
export function isOutOfPlayer(pos: Position, player: Player) {
  const blockPos = pos.map(Math.floor);
  const playerHead = player.position.toArray().map(Math.floor);
  const playerFeet = player.position
    .sub(new Vector3(0, 1, 0))
    .toArray()
    .map(Math.floor);
  if (areSame(blockPos, playerHead)) {
    console.log("Trying to create block within player head!");
    return false;
  }

  if (areSame(blockPos, playerFeet)) {
    console.log("Trying to create block within player feet!");
    return false;
  }

  return true;
}

export function convertIntersectionToPosition(
  intersection: Intersection,
  voxelId: number
) {
  const pos = intersection.position
    .map((v, ndx) => {
      return v + intersection.normal[ndx] * (voxelId > 0 ? 0.5 : -0.5);
    })
    .map((coord) => Math.floor(coord)) as Position;
  return pos;
}

export async function placeVoxel(
  voxelId: number,
  globalChunks: Chunks,
  pos: Position
) {
  console.log("Setting voxel at ", pos);
  console.log("Voxel at mouse click", getVoxel(globalChunks, pos));
  const chunkId = computeChunkId(pos);
  setVoxel({ [chunkId]: globalChunks[chunkId] }, pos, voxelId);
  const ownLight = glowingBlocks.includes(voxelId) ? 15 : 0;

  const neighborLight = neighborOffsets.reduce((currentMax, offset) => {
    const neighborPos = pos.map(
      (coord, i) => coord + offset.toArray()[i]
    ) as Position;
    const { light } = getVoxel(globalChunks, neighborPos);
    return Math.max(light, currentMax);
  }, 0);
  const lightValue = Math.max(ownLight, neighborLight - 1);
  setLightValue(globalChunks, pos, lightValue);

  await chunkWorkerPool.queue(async (worker) => {
    const { updatedChunks } = await worker.floodLight(
      pickSurroundingChunks(globalChunks, chunkId),
      [{ pos, lightValue }]
    );
    mergeChunkUpdates(globalChunks, updatedChunks);
  });

  const { updatedChunks } = await sunlightChunks(
    getSurroundingChunksColumns(globalChunks, chunkId),
    [chunkId]
  );
  mergeChunkUpdates(globalChunks, updatedChunks);
  return globalChunks;
}
