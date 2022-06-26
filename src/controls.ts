import { Vector3 } from "three";
import { blocks } from "./blocks";
import { getHeightValue } from "./chunkLogic";
import { terrainHeight } from "./constants";
import { MouseClickEvent } from "./helpers";
import {
  convertIntersectionToPosition,
  getIntersection,
  isOutOfPlayer,
  placeVoxel,
} from "./placeVoxel";
import { player } from "./Player";
import { world } from "./world";

const { air } = blocks;

function handleMouseClick(event: MouseEvent) {
  if (world.menu) return;
  const mouseClick = new MouseClickEvent(event);
  const intersection = getIntersection(mouseClick);
  const block = mouseClick.right ? world.inventory.takeOutItem() : air;
  if (intersection) {
    const pos = convertIntersectionToPosition(intersection, block);
    if (mouseClick.right && (!isOutOfPlayer(pos) || block === air)) return;

    placeVoxel(block, pos);
  }
}

const keyboardControls = (event: KeyboardEvent) => {
  if (event.repeat) {
    return;
  }
  switch (event.code) {
    case "KeyE":
      if (!player.controls.isLocked && !world.inventory.isOpen) return;
      world.inventory.toggle();
      world.inventory.isOpen
        ? player.controls.unlock()
        : player.controls.lock();
      break;
    case "KeyH":
      console.log(
        "world.Player Position: ",
        player.position.toArray().map((elem) => Math.floor(elem))
      );
      break;
    case "KeyF":
      const pos = player.controls.getObject().position;
      const newPos = new Vector3(0, terrainHeight + 5, 0);
      pos.y = newPos.y;
      pos.x = newPos.x;
      pos.z = newPos.z;

      break;
    case "KeyZ":
      console.log("Pressed Z");
      world.chunkHelperVisibility = !world.chunkHelperVisibility;

      Object.keys(world.debugMeshes).forEach((chunkId) => {
        world.debugMeshes[chunkId].visible = world.chunkHelperVisibility;
      });
      break;
    case "KeyK":
      console.log("Camera Debug");
      const camDirection = new Vector3(0, 0, 0);
      world.camera.getWorldDirection(camDirection);

      console.log("direction", camDirection);
      console.log("position:", world.camera.position);
      break;
    case "KeyG":
      console.log("Pressed G", player.position);
      console.log(
        "X is stuck",
        player.position.x - Math.floor(player.position.x) <= 0.001
      );
      console.log(
        "Z is stuck",
        player.position.z - Math.floor(player.position.z) <= 0.001
      );
      break;
    case "KeyK":
      console.log(
        "Height Value here",
        getHeightValue(player.position.x, player.position.z)
      );
      break;
  }
};

export function setupControls() {
  const blocker = document.getElementById("blocker");
  const crosshairs = document.getElementById("crosshairContainer");
  const instructions = document.getElementById("instructions");

  blocker.addEventListener("click", function () {
    player.controls.lock();
  });

  player.controls.addEventListener("lock", function () {
    world.menu = false;
    instructions.style.display = "none";
    blocker.style.display = "none";
    if (!world.inventory.isOpen) {
      crosshairs.style.display = "flex";
      world.inventory.hotbarElement.style.display = "flex";
    }
  });

  player.controls.addEventListener("unlock", function () {
    world.menu = true;
    if (!world.inventory.isOpen) {
      blocker.style.display = "flex";
      instructions.style.display = "block";
      world.inventory.hotbarElement.style.display = "none";
    }
    crosshairs.style.display = "none";
  });

  document.addEventListener("keypress", keyboardControls);
  window.addEventListener("click", handleMouseClick);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  world.scene.add(player.controls.getObject());
}

function onKeyDown(event: { code: string }) {
  // console.log("Pressed Key with code:", event.code);
  switch (event.code) {
    case "KeyM":
      player.controlMaxSpeed(10);
      break;
    case "KeyN":
      player.controlMaxSpeed(-10);
      break;
    case "ArrowUp":
    case "KeyW":
      player.moveForward = true;
      break;

    case "ArrowLeft":
    case "KeyA":
      player.moveLeft = true;
      break;

    case "ArrowDown":
    case "KeyS":
      player.moveBackward = true;
      break;

    case "ArrowRight":
    case "KeyD":
      player.moveRight = true;
      break;

    case "KeyC":
      player.moveDown = true;
      break;
    case "KeyJ":
      player.gravity = !player.gravity;
    case "Space":
      if (!player.gravity) {
        player.moveUp = true;
      }
      if (!player.isFlying) {
        player.jump();
      }
      break;
  }
}

function onKeyUp(event: { code: string }) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      player.moveForward = false;
      break;

    case "ArrowLeft":
    case "KeyA":
      player.moveLeft = false;
      break;

    case "ArrowDown":
    case "KeyS":
      player.moveBackward = false;
      break;

    case "ArrowRight":
    case "KeyD":
      player.moveRight = false;
      break;

    case "KeyC":
      player.moveDown = false;
      break;

    case "Space":
      player.moveUp = false;
      break;
  }
}
