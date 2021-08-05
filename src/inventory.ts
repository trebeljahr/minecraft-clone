import { blocks } from "./blocks";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";

const {
  gold,
  birchwood,
  oakwood,
  stone,
  iron,
  lapis,
  cactus,
  emerald,
  foliage,
  air,
} = blocks;

const hotbar = [
  birchwood,
  oakwood,
  stone,
  iron,
  lapis,
  gold,
  emerald,
  cactus,
  foliage,
] as HotbarContents;

type HotbarContents = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

interface InventorySlot {
  amount: number;
  blockType: number;
}

const inventoryRows = 5;
const inventoryCols = 9;
const maxItemStack = 128;

export class Inventory {
  private slots: InventorySlot[];
  public isOpen = false;
  constructor() {
    this.slots = Array(inventoryRows * inventoryCols).fill({
      blockType: air,
      amount: 0,
    });
    for (let _ in this.slots) {
      const node = document.createElement("div");
      this.inventoryDomContainer.appendChild(node);
    }
  }

  get inventoryDomContainer() {
    return document.getElementById("inventoryContainer");
  }

  get element() {
    return document.getElementById("inventory");
  }

  findFreeSlot() {
    const slot = this.slots.findIndex((item) => item.blockType === air);
    return { hasFreeSlot: slot !== 1, index: slot };
  }

  toggle() {
    this.element.style.display = this.isOpen ? "none" : "flex";
    this.isOpen = !this.isOpen;
  }

  canFitIntoSameSlot() {}

  addTo(blockType: number, amount: number) {
    const { hasFreeSlot, index } = this.findFreeSlot();
    if (hasFreeSlot) {
      this.slots[index] = { blockType, amount };
    }
  }
}

export class Hotbar {
  private content: HotbarContents;
  private activeSlot = 1;
  constructor() {
    this.content = hotbar; // Array(9).fill(air) as HotbarContents;
  }
  changeItem(block: number, hotbarIndex: number) {
    this.content[hotbarIndex] = block;
  }

  get element() {
    return document.getElementById("hotbar");
  }

  cycle(reverse: boolean) {
    if (reverse) {
      this.activeSlot--;
    } else {
      this.activeSlot++;
    }
    if (this.activeSlot > 9) {
      this.activeSlot = 1;
    }
    if (this.activeSlot < 1) {
      this.activeSlot = 9;
    }
  }
  getActiveSlot() {
    return this.activeSlot;
  }
  select() {
    return this.content[this.activeSlot - 1] || air;
  }
}