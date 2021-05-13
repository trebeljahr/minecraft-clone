import { Vector3 } from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { copy } from "./constants";
import { World } from "./VoxelWorld";

const eyeLevel = 1.5;
const maxSpeed = 10;

let moveForward = false;
let moveBack = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let isFlying = false;

export class Player {
  public controls: PointerLockControls;
  private velocity = new Vector3(0, 0, 0);
  private planarVelocity = new Vector3(0, 0, 0);
  private world: World;
  private canJump: boolean;
  constructor(controls: PointerLockControls, world: World) {
    this.controls = controls;
    this.world = world;
    this.canJump = false;
    this.addListeners();
  }
  tick(delta: number) {
    this.movePlayer(delta);
  }

  jump() {
    console.log("Can jump? ", this.canJump);
    console.log("Velocity.Y? ", this.velocity.y);
    if (this.canJump) {
      this.velocity.y = 12;
      this.canJump = false;
      console.log("Velocity.Y after? ", this.velocity.y);
    }
  }
  standsOnGround(delta: number): boolean {
    const resetVel = () =>
      (this.controls.getObject().position.y -= this.velocity.y * delta);

    this.controls.getObject().position.y += this.velocity.y * delta;
    if (this.collidesWithTerrain) {
      resetVel();
      return true;
    }
    resetVel();
    return false;
  }

  movePlayer(delta: number) {
    if (this.controls.isLocked === true) {
      this.planarVelocity.x -= this.planarVelocity.x * 20 * delta;
      this.planarVelocity.z -= this.planarVelocity.z * 20 * delta;

      const onGround = this.standsOnGround(delta);
      // console.log("isFalling", isFalling);
      if (onGround) {
        this.planarVelocity.z += this.direction.z * 300 * delta;
        this.planarVelocity.x += this.direction.x * 300 * delta;
      } else {
        this.planarVelocity.z += this.direction.z * 100 * delta;
        this.planarVelocity.x += this.direction.x * 100 * delta;
      }
      this.planarVelocity.clampLength(0, maxSpeed);
      this.velocity.x = this.planarVelocity.x;
      this.velocity.z = this.planarVelocity.z;

      // this.canJump = false;
      if (this.velocity.y > -30 && !onGround)
        this.velocity.y -= 9.8 * 5 * delta;

      this.controls.getObject().position.y += this.velocity.y * delta;
      if (this.collidesWithTerrain) {
        if (this.velocity.y < 0) {
          this.canJump = true;
        }
        this.controls.getObject().position.y -= this.velocity.y * delta;
      }

      this.controls.moveRight(this.velocity.x * delta);
      if (this.collidesWithTerrain) {
        this.controls.moveRight(-this.velocity.x * delta);
      }

      this.controls.moveForward(this.velocity.z * delta);
      if (this.collidesWithTerrain) {
        this.controls.moveForward(-this.velocity.z * delta);
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

  get direction(): Vector3 {
    const forwardBack = Number(moveForward) - Number(moveBack);
    const leftRight = Number(moveRight) - Number(moveLeft);
    return new Vector3(leftRight, 0, forwardBack).normalize();
  }

  onKeyDown(event: { code: string }) {
    switch (event.code) {
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

      case "Space":
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
    console.log("Adding listeners");
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp);
  }

  removeListeners() {
    console.log("Removing listeners");
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  }
}
