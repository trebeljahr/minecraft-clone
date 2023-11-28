import { Vector3 } from "three";
import { getVoxel } from "./helpers";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { Chunks, copy } from "./constants";
import { world } from "./world";

class Player {
  public controls: PointerLockControls;
  private velocity = new Vector3(0, 0, 0);
  private planarVelocity = new Vector3(0, 0, 0);
  public canJump: boolean;
  public moveForward = false;
  public moveBackward = false;
  public moveLeft = false;
  public moveRight = false;
  public moveUp = false;
  public moveDown = false;
  public isFlying = false;
  public gravity = false;
  public eyeLevel = 1.5;
  public maxSpeed = this.gravity ? 100 : 300;

  constructor() {
    this.controls = new PointerLockControls(world.camera, document.body);
    this.canJump = false;
  }
  tick(delta: number) {
    this.movePlayer(delta);
  }

  jump() {
    if (this.canJump) {
      this.velocity.y = 12;
      this.canJump = false;
    }
  }
  standsOnGround(): boolean {
    if (this.collidesWithTerrain) {
      return true;
    }
    return false;
  }

  movePlayer(delta: number) {
    if (this.controls.isLocked === true) {
      // console.log(delta);
      // const before = copy(this.position);
      // console.log("before update: ", before);
      this.planarVelocity.x -= this.planarVelocity.x * 20 * delta;
      this.planarVelocity.z -= this.planarVelocity.z * 20 * delta;

      this.planarVelocity.z +=
        this.directionPlayerWantsToMove.z * this.maxSpeed * delta;
      this.planarVelocity.x +=
        this.directionPlayerWantsToMove.x * this.maxSpeed * delta;

      this.planarVelocity.clampLength(0, this.maxSpeed);
      this.velocity.x = this.planarVelocity.x;
      this.velocity.z = this.planarVelocity.z;

      this.pos.y += this.velocity.y * delta;
      const onGround = this.collidesWithTerrain;

      if (onGround) {
        if (this.velocity.y < 0) {
          this.canJump = true;
        }
        console.log("colliding with terrain on y direction");
        this.pos.y -= this.velocity.y * delta;
      }

      if (this.velocity.y > -30 && !onGround && this.gravity)
        this.velocity.y -= 9.8 * 5 * delta;

      if (!this.gravity && this.moveDown) {
        this.pos.y -= (this.maxSpeed / 10) * delta;
      }
      if (!this.gravity && this.moveUp) {
        this.pos.y += (this.maxSpeed / 10) * delta;
      }

      const clippingOffsetX = this.velocity.x < 0 ? -0.5 : 0.5;
      const clippingOffsetZ = this.velocity.z < 0 ? -0.5 : 0.5;

      this.controls.moveRight(this.velocity.x * delta + clippingOffsetX);
      if (!this.collidesWithTerrain) {
        this.controls.moveRight(this.velocity.x * delta);
      }
      this.controls.moveRight(-this.velocity.x * delta - clippingOffsetX);

      this.controls.moveForward(this.velocity.z * delta + clippingOffsetZ);
      if (!this.collidesWithTerrain) {
        this.controls.moveForward(this.velocity.z * delta);
      }
      this.controls.moveForward(-this.velocity.z * delta - clippingOffsetZ);
    }
  }

  get pos(): Vector3 {
    return this.controls.getObject().position;
  }

  get position(): Vector3 {
    return copy(this.controls.getObject().position);
  }

  wouldCollideWithTerrain({ x, y, z }: Vector3) {
    const { type: collision } = getVoxel(world.globalChunks, [x, y, z]);
    if (collision !== 0) return true;
    return false;
  }

  get collidesWithTerrain(): boolean {
    return (
      this.wouldCollideWithTerrain(this.position) ||
      this.wouldCollideWithTerrain(
        this.position.sub(new Vector3(0, this.eyeLevel, 0))
      )
    );
  }
  get directionPlayerWantsToMove(): Vector3 {
    const forwardBack = Number(this.moveForward) - Number(this.moveBackward);
    const leftRight = Number(this.moveRight) - Number(this.moveLeft);
    return new Vector3(leftRight, 0, forwardBack).normalize();
  }

  controlMaxSpeed(update: number) {
    this.maxSpeed += Math.max(0, this.maxSpeed + update);
    console.log("New Max Speed", this.maxSpeed);
  }
}

export const player = new Player();
