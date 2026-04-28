import { Color, Fog } from "three";
import { displayTestBed } from "./chunkLogic/tests/generateTestChunks";
import {
  chunkSize,
  fogColor,
  inMultipleChunksMode,
  inSingleBlockMode,
  inSingleChunkMode,
  inTestMode,
  viewDistance,
} from "./constants";
import { setupControls } from "./controls";
import { generate } from "./generateChunks";
import { SimpleTimer } from "./helpers";
import { Loop } from "./Loop";
import { onlyDisplaySingleBlock } from "./onlyDisplaySingleBlock";
import { player } from "./Player";
import { onWindowResize } from "./rendering";
import { handleChunks, shouldChunksUpdate } from "./streamChunks";
import { world } from "./world";

init();

async function onlyDisplaySingleChunk() {
  const chunkId = "0,0,0";
  await generate(world.globalChunks, [chunkId]);

  const button = document.getElementById("playButton") as HTMLButtonElement;
  button.disabled = false;
}

async function onlyDisplayFewChunks() {
  const chunkIds = [
    "0,0,0",
    "0,0,1",
    "0,0,2",
    "1,0,0",
    "2,0,0",
    "2,0,1",
    "2,0,2",
    "1,0,2",
    "1,0,1",
  ];
  await generate(world.globalChunks, chunkIds);

  const button = document.getElementById("playButton") as HTMLButtonElement;
  button.disabled = false;
}

async function init() {
  const loop = new Loop(world.renderer);

  if (inSingleBlockMode) onlyDisplaySingleBlock();
  else if (inSingleChunkMode) onlyDisplaySingleChunk();
  else if (inMultipleChunksMode) onlyDisplayFewChunks();
  else if (inTestMode) await displayTestBed();
  else {
    const logTime = new SimpleTimer();
    await handleChunks();
    logTime.takenFor("Init");
    world.initialLoadDone = true;

    loop.register({ tick: shouldChunksUpdate });
  }

  const button = document.getElementById("playButton") as HTMLButtonElement;
  button.disabled = false;

  loop.register(player);

  loop.start();

  setupControls();
  const color = fogColor;
  world.scene.fog = new Fog(
    color,
    viewDistance * chunkSize - 2 * chunkSize,
    viewDistance * chunkSize,
  );
  world.scene.background = new Color(color);

  window.addEventListener("resize", onWindowResize);
}
