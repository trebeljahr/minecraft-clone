import { Vector3 } from "three";
import { Chunks, Position } from "./constants";
import { getVoxel } from "./helpers";

export interface Intersection {
  position: Position;
  normal: Position;
  voxel: number;
}

export function intersectRay(
  chunks: Chunks,
  start: Vector3,
  end: Vector3,
  velocity = 6
): Intersection | null {
  const {
    x: dx,
    y: dy,
    z: dz,
  } = new Vector3().copy(end).sub(start).normalize();

  let t = 0.0;
  let { x: ix, y: iy, z: iz } = new Vector3().copy(start).floor();

  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;

  const txDelta = Math.abs(1 / dx);
  const tyDelta = Math.abs(1 / dy);
  const tzDelta = Math.abs(1 / dz);

  const xDist = stepX > 0 ? ix + 1 - start.x : start.x - ix;
  const yDist = stepY > 0 ? iy + 1 - start.y : start.y - iy;
  const zDist = stepZ > 0 ? iz + 1 - start.z : start.z - iz;

  let txMax = txDelta < Infinity ? txDelta * xDist : Infinity;
  let tyMax = tyDelta < Infinity ? tyDelta * yDist : Infinity;
  let tzMax = tzDelta < Infinity ? tzDelta * zDist : Infinity;

  let steppedIndex = -1;

  while (t <= velocity) {
    const { type: voxel } = getVoxel(chunks, [ix, iy, iz]);
    if (voxel) {
      return {
        position: [start.x + t * dx, start.y + t * dy, start.z + t * dz],
        normal: [
          steppedIndex === 0 ? -stepX : 0,
          steppedIndex === 1 ? -stepY : 0,
          steppedIndex === 2 ? -stepZ : 0,
        ],
        voxel,
      };
    }

    if (txMax < tyMax) {
      if (txMax < tzMax) {
        ix += stepX;
        t = txMax;
        txMax += txDelta;
        steppedIndex = 0;
      } else {
        iz += stepZ;
        t = tzMax;
        tzMax += tzDelta;
        steppedIndex = 2;
      }
    } else {
      if (tyMax < tzMax) {
        iy += stepY;
        t = tyMax;
        tyMax += tyDelta;
        steppedIndex = 1;
      } else {
        iz += stepZ;
        t = tzMax;
        tzMax += tzDelta;
        steppedIndex = 2;
      }
    }
  }
  return null;
}
