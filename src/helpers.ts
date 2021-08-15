import { fields, chunkSize, chunkSliceSize, Position } from "./constants";
import { MathUtils } from "three";

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

export function computeVoxelIndex(pos: Position) {
  const [x, y, z] = pos
    .map((coord) => MathUtils.euclideanModulo(coord, chunkSize))
    .map((value) => value | 0);
  return (y * chunkSliceSize + z * chunkSize + x) * fields.count;
}
