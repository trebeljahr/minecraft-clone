import { PerspectiveCamera, Vector3 } from "three";
import { blocks } from "./blocks";
import { setVoxel } from "./chunkLogic";
import { Chunks, glowingBlocks, neighborOffsets, Position } from "./constants";
import {
  computeChunkId,
  getVoxel,
  MouseClickEvent,
  setLightValue,
} from "./helpers";
import { intersectRay, Intersection } from "./intersectRay";
import { Inventory } from "./inventory";
import { player } from "./Player";
import { requestRenderIfNotRequested } from "./rendering";
import {
  getSurroundingChunksColumns,
  mergeChunkUpdates,
  pickSurroundingChunks,
  sunlightChunks,
  updateSurroundingChunkGeometry,
} from "./streamChunks";
import { chunkWorkerPool } from "./workers/workerPool";
import { world } from "./world";

const { air } = blocks;

export function getIntersection(mouseClick: MouseClickEvent) {
  if (!(mouseClick.right || mouseClick.left)) return;

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const x = (pos.x / window.innerWidth) * 2 - 1;
  const y = (pos.y / window.innerHeight) * -2 + 1;

  const start = new Vector3();
  const end = new Vector3();
  start.setFromMatrixPosition(world.camera.matrixWorld);
  end.set(x, y, 1).unproject(world.camera);

  const intersection = intersectRay(world.globalChunks, start, end);
  return intersection;
}

export function areSame(a: any[], b: any[]) {
  return (
    a.every((item) => b.includes(item)) && b.every((item) => a.includes(item))
  );
}
export function isOutOfPlayer(pos: Position) {
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

export async function placeVoxel(voxelId: number, pos: Position) {
  console.log("Setting voxel at ", pos);
  console.log("Voxel at mouse click", getVoxel(world.globalChunks, pos));
  const chunkId = computeChunkId(pos);
  setVoxel({ [chunkId]: world.globalChunks[chunkId] }, pos, voxelId);
  const ownLight = glowingBlocks.includes(voxelId) ? 15 : 0;

  const neighborLight = neighborOffsets.reduce((currentMax, offset) => {
    const neighborPos = pos.map(
      (coord, i) => coord + offset.toArray()[i]
    ) as Position;
    const { light } = getVoxel(world.globalChunks, neighborPos);
    return Math.max(light, currentMax);
  }, 0);
  const lightValue = Math.max(ownLight, neighborLight - 1);
  setLightValue(world.globalChunks, pos, lightValue);

  await chunkWorkerPool.queue(async (worker) => {
    const { updatedChunks } = await worker.floodLight(
      pickSurroundingChunks(chunkId),
      [{ pos, lightValue }]
    );
    mergeChunkUpdates(updatedChunks);
  });

  await sunlightChunks(getSurroundingChunksColumns(chunkId), [chunkId]);

  updateSurroundingChunkGeometry(pos);
  requestRenderIfNotRequested();
}
