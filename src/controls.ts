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
      if (!world.player.controls.isLocked && !world.inventory.isOpen) return;
      world.inventory.toggle();
      world.inventory.isOpen
        ? world.player.controls.unlock()
        : world.player.controls.lock();
      break;
    case "KeyH":
      console.log(
        "world.Player Position: ",
        world.player.position.toArray().map((elem) => Math.floor(elem))
      );
      break;
    case "KeyF":
      const pos = world.player.controls.getObject().position;
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
      console.log("Pressed G", world.player.position);
      console.log(
        "X is stuck",
        world.player.position.x - Math.floor(world.player.position.x) <= 0.001
      );
      console.log(
        "Z is stuck",
        world.player.position.z - Math.floor(world.player.position.z) <= 0.001
      );
      break;
    case "KeyK":
      console.log(
        "Height Value here",
        getHeightValue(world.player.position.x, world.player.position.z)
      );
      break;
  }
};

export function setupControls() {
  const blocker = document.getElementById("blocker");
  const crosshairs = document.getElementById("crosshairContainer");
  const instructions = document.getElementById("instructions");

  blocker.addEventListener("click", function () {
    world.player.controls.lock();
  });

  world.player.controls.addEventListener("lock", function () {
    world.menu = false;
    instructions.style.display = "none";
    blocker.style.display = "none";
    if (!world.inventory.isOpen) {
      crosshairs.style.display = "flex";
      world.inventory.hotbarElement.style.display = "flex";
    }
  });

  world.player.controls.addEventListener("unlock", function () {
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

  world.scene.add(world.player.controls.getObject());
}
