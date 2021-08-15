import { fields, copy, chunkSize, chunkSliceSize, Position } from "./constants";
import { MathUtils, Vector3 } from "three";

const leftMouse = 0;
const rightMouse = 2;

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

export function computeChunkDistanceFromPoint(
  point: Position,
  chunkId: string
) {
  console.log(chunkId.split(",").map((elem) => parseInt(elem)));
  const chunkPos = new Vector3(
    ...chunkId.split(",").map((elem) => parseInt(elem))
  );
  const pos = new Vector3(...computeChunkCoordinates(point));
  console.log(pos);
  const distance = chunkPos.distanceTo(pos);
  console.log("Distance from point", distance);
  return distance;
}

export function computeVoxelIndex(pos: Position) {
  const [x, y, z] = pos
    .map((coord) => MathUtils.euclideanModulo(coord, chunkSize))
    .map((value) => value | 0);
  return (y * chunkSliceSize + z * chunkSize + x) * fields.count;
}

export function computeChunkOffset(pos: Position): Position {
  return computeChunkCoordinates(pos).map(
    (coord) => coord * chunkSize
  ) as Position;
}

export function computeChunkIndex(pos: Position) {
  return computeChunkCoordinates(pos).join(",");
}

export function computeChunkCoordinates(pos: Position): Position {
  return pos.map((coord) => coord / chunkSize).map(Math.floor) as Position;
}
export function computeVoxelCoordinates(pos: Vector3) {
  return copy(pos).floor();
}
