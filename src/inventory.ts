import { blocks } from "./blocks";
import { Swappable } from "@shopify/draggable";

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

const initialHotbar = [
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

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export class Inventory {
  private slots: InventorySlot[];
  public isOpen = false;
  constructor() {
    this.slots = Array(inventoryRows * inventoryCols).fill({
      blockType: air,
      amount: 0,
    });
    this.hotbarSlots = initialHotbar;

    for (let _ in this.slots) {
      const node = document.createElement("div");
      const secondNode = document.createElement("span");

      node.setAttribute("class", "centered");
      secondNode.setAttribute("class", "inventoryItem");
      secondNode.style.background = getRandomColor();
      node.appendChild(secondNode);
      this.containerElement.appendChild(node);
    }
    for (let _ in this.hotbarSlots) {
      const node = document.createElement("div");
      const secondNode = document.createElement("span");

      node.setAttribute("class", "centered");
      secondNode.setAttribute("class", "inventoryItem");
      secondNode.style.background = getRandomColor();
      node.appendChild(secondNode);
      this.hotbarContainerElement.appendChild(node);
    }
    const swappableContainers = this.containerElement.children;
    const swappableHotbarContainers = this.hotbarContainerElement.children;
    new Swappable([...swappableContainers, ...swappableHotbarContainers], {
      draggable: "span",
    });
  }

  get containerElement() {
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

  private hotbarSlots: HotbarContents;
  private activeHotbarSlot = 1;

  changeHotbarItem(block: number, hotbarIndex: number) {
    this.hotbarSlots[hotbarIndex] = block;
  }

  get hotbarElement() {
    return document.getElementById("hotbar");
  }

  get hotbarContainerElement() {
    return document.getElementById("hotbarContainer");
  }

  cycleHotbar(reverse: boolean) {
    if (reverse) {
      this.activeHotbarSlot--;
    } else {
      this.activeHotbarSlot++;
    }
    if (this.activeHotbarSlot > 9) {
      this.activeHotbarSlot = 1;
    }
    if (this.activeHotbarSlot < 1) {
      this.activeHotbarSlot = 9;
    }
  }
  getActiveHotbarSlot() {
    return this.activeHotbarSlot;
  }
  selectFromActiveHotbarSlot() {
    return this.hotbarSlots[this.activeHotbarSlot - 1] || air;
  }
}

// export class Hotbar {
//   private content: HotbarContents;
//   private activeSlot = 1;
//   constructor() {
//     this.content = hotbar; // Array(9).fill(air) as HotbarContents;
//   }
//   changeItem(block: number, hotbarIndex: number) {
//     this.content[hotbarIndex] = block;
//   }

//   get element() {
//     return document.getElementById("hotbar");
//   }

//   cycle(reverse: boolean) {
//     if (reverse) {
//       this.activeSlot--;
//     } else {
//       this.activeSlot++;
//     }
//     if (this.activeSlot > 9) {
//       this.activeSlot = 1;
//     }
//     if (this.activeSlot < 1) {
//       this.activeSlot = 9;
//     }
//   }
//   getActiveSlot() {
//     return this.activeSlot;
//   }
//   select() {
//     return this.content[this.activeSlot - 1] || air;
//   }
// }
