import { Vector2Tuple, Vector3 } from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { copy } from "./constants";
import { PlayerInput } from "./controls";
import { World } from "./VoxelWorld";

const eyeLevel = 1.5;
const maxSpeed = 10 / 50;

export class Player {
  public controls: PointerLockControls;
  private velocity = new Vector3(0, 0, 0);
  private input = new PlayerInput();
  private world: World;
  private canJump = false;
  constructor(controls: PointerLockControls, world: World) {
    this.controls = controls;
    this.world = world;
  }
  tick(delta: number) {
    this.movePlayer();
  }

  movePlayer() {
    if (this.controls.isLocked === true) {
      // console.log(this.input.direction);
      this.velocity.z = this.input.direction.z * maxSpeed;
      this.velocity.x = this.input.direction.x * maxSpeed;
      if (this.velocity.y >= -maxSpeed * 2) this.velocity.y -= 0.3;

      this.controls.moveRight(this.velocity.x);
      if (this.collidesWithTerrain) {
        this.controls.moveRight(-this.velocity.x);
      }

      this.controls.getObject().position.y += this.velocity.y;
      if (this.collidesWithTerrain) {
        this.canJump = true;
        this.controls.getObject().position.y -= this.velocity.y;
      }

      this.controls.moveForward(this.velocity.z);
      if (this.collidesWithTerrain) {
        this.controls.moveForward(-this.velocity.z);
      }
    }
  }

  get position(): Vector3 {
    return copy(this.controls.getObject().position);
  }

  wouldCollideWithTerrain({ x, y, z }: Vector3) {
    const collision = this.world.getVoxel(x, y, z);
    if (collision !== 0) return true;
    return false;
  }

  get collidesWithTerrain(): boolean {
    return (
      this.wouldCollideWithTerrain(this.position) ||
      this.wouldCollideWithTerrain(
        this.position.sub(new Vector3(0, eyeLevel, 0))
      )
    );
  }
}
