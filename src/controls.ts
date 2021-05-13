import { Vector3 } from "three";

let moveForward = false;
let moveBack = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

export class PlayerInput {
  constructor() {
    this.addListeners();
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
        moveUp = true;
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
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
  }

  removeListeners() {
    console.log("Removing listeners");
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  }
}
