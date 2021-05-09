export let moveForward = false;
export let moveBack = false;
export let moveLeft = false;
export let moveRight = false;
export let moveUp = false;
export let moveDown = false;

const onKeyDown = function (event) {
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
};

const onKeyUp = function (event) {
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
};

export function addListeners() {
  console.log("Adding listeners");

  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("keyup", onKeyUp);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
}
