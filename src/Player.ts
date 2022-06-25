import { Vector3 } from "three";
import { getVoxel } from "./helpers";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { Chunks, copy } from "./constants";

const eyeLevel = 1.5;
let gravity = false; // can be set to disable/enable falling
let maxSpeed = gravity ? 100 : 300;
let moveForward = false;
let moveBack = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let isFlying = false;

export class Player {
  public controls: PointerLockControls;
  private chunks: Chunks;
  private velocity = new Vector3(0, 0, 0);
  private planarVelocity = new Vector3(0, 0, 0);
  private canJump: boolean;
  constructor(controls: PointerLockControls, chunks: Chunks) {
    this.controls = controls;
    this.canJump = false;
    this.chunks = chunks;
    this.addListeners();
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
        this.directionPlayerWantsToMove.z * maxSpeed * delta;
      this.planarVelocity.x +=
        this.directionPlayerWantsToMove.x * maxSpeed * delta;

      this.planarVelocity.clampLength(0, maxSpeed);
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

      if (this.velocity.y > -30 && !onGround && gravity)
        this.velocity.y -= 9.8 * 5 * delta;

      if (!gravity && moveDown) {
        // console.log("moving down");
        this.pos.y -= (maxSpeed / 10) * delta;
      }
      if (!gravity && moveUp) {
        // console.log("moving up");
        this.pos.y += (maxSpeed / 10) * delta;
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
    const { type: collision } = getVoxel(this.chunks, [x, y, z]);
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
  get directionPlayerWantsToMove(): Vector3 {
    const forwardBack = Number(moveForward) - Number(moveBack);
    const leftRight = Number(moveRight) - Number(moveLeft);
    return new Vector3(leftRight, 0, forwardBack).normalize();
  }

  onKeyDown(event: { code: string }) {
    // console.log("Pressed Key with code:", event.code);
    switch (event.code) {
      case "KeyM":
        maxSpeed += 10;
        console.log("Max speed increased to: ", maxSpeed);
        break;
      case "KeyN":
        maxSpeed = Math.max(0, maxSpeed - 10);
        console.log("Max speed decreased to: ", maxSpeed);
        break;
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBack = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "KeyC":
        moveDown = true;
        break;
      case "KeyJ":
        gravity = !gravity;
      case "Space":
        if (!gravity) {
          moveUp = true;
        }
        if (!isFlying) {
          this.jump();
        }
        break;
    }
  }

  onKeyUp(event: { code: string }) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBack = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;

      case "KeyC":
        moveDown = false;
        break;

      case "Space":
        moveUp = false;
        break;
    }
  }

  addListeners() {
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp);
  }

  removeListeners() {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  }
}
