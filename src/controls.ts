import { Vector3 } from "three";
import { blocks } from "./blocks";
import { getHeightValue } from "./chunkLogic";
import { terrainHeight } from "./constants";
import { MouseClickEvent, getVoxel } from "./helpers";
import {
  convertIntersectionToPosition,
  getIntersection,
  isOutOfPlayer,
  placeVoxel,
} from "./placeVoxel";
import { player } from "./Player";
import { world } from "./world";
import { Intersection } from "./intersectRay";

const { air } = blocks;

function placeBlockFromInventory(intersection: Intersection) {
  const block = world.inventory.getActiveItemInHotbar();
  const pos = convertIntersectionToPosition(intersection, block);
  if (!isOutOfPlayer(pos) || block === air) return;

  placeVoxel(block, pos);
  if (!air) world.inventory.takeOutItem();
}

function mineBlockFromWorld(intersection: Intersection) {
  const pos = convertIntersectionToPosition(intersection, air);
  const minedVoxel = getVoxel(world.globalChunks, pos);
  placeVoxel(air, pos);
  world.inventory.addIntoInventory(minedVoxel.type, 1);
}

function handleMouseClick(event: MouseEvent) {
  if (world.menu) return;

  const mouseClick = new MouseClickEvent(event);
  const intersection = getIntersection(mouseClick);
  if (intersection) {
    if (mouseClick.right) placeBlockFromInventory(intersection);
    if (mouseClick.left) mineBlockFromWorld(intersection);
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
      if (world.inventory.isOpen) player.controls.unlock();
      else player.controls.lock();

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
  const crosshairs = document.getElementById("crosshairContainer");
  const menu = document.getElementById("menu");
  const playButton = document.getElementById("playButton");
  const controlsButton = document.getElementById("controlsButton");
  const optionsButton = document.getElementById("optionsButton");
  const controls = document.getElementById("controlsScreen");
  const options = document.getElementById("optionsScreen");
  const optionsBackButton = document.getElementById("optionsBackButton");
  const controlsBackButton = document.getElementById("controlsBackButton");
  const menuScreen = document.getElementById("menuScreen");

  controlsButton.addEventListener("click", () => {
    console.log("Clicked controls");
    controls.style.display = "flex";
    menuScreen.style.display = "none";
  });

  optionsButton.addEventListener("click", () => {
    console.log("Clicked options");
    options.style.display = "flex";
    menuScreen.style.display = "none";
  });

  optionsBackButton.addEventListener("click", () => {
    options.style.display = "none";
    menuScreen.style.display = "flex";
  });

  controlsBackButton.addEventListener("click", () => {
    controls.style.display = "none";
    menuScreen.style.display = "flex";
  });

  playButton.addEventListener("click", () => {
    menu.style.opacity = "0";
    crosshairs.style.display = "flex";
    world.inventory.hotbarContainerElement.style.display = "flex";

    setTimeout(() => {
      player.controls.lock();
    }, 1000);
  });

  player.controls.addEventListener("lock", () => {
    world.menu = false;

    if (!world.inventory.isOpen) {
      crosshairs.style.display = "flex";
      menu.style.display = "none";
    }
  });

  player.controls.addEventListener("unlock", () => {
    world.menu = true;
    if (!world.inventory.isOpen) {
      menu.style.display = "flex";
      menu.style.opacity = "1";
      document.body.style.cursor = "pointer";
      world.inventory.hotbarContainerElement.style.display = "none";
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
    default:
      console.log("Pressed Key with code:", event.code);
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
