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

const makeInventoryNode = () => {
  const node = document.createElement("div");
  const secondNode = document.createElement("span");

  node.setAttribute("class", "centered");
  secondNode.setAttribute("class", "inventoryItem");
  secondNode.style.background = getRandomColor();
  node.appendChild(secondNode);

  return node;
};
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
      const node = makeInventoryNode();
      this.containerElement.appendChild(node);
    }
    for (let _ in this.hotbarSlots) {
      const node = makeInventoryNode();
      this.hotbarContainerElement.appendChild(node);
    }
    const swappableContainers = this.containerElement.children;
    const swappableHotbarContainers = this.hotbarContainerElement.children;

    new Swappable([...swappableContainers, ...swappableHotbarContainers], {
      draggable: "span",
    });

    // attach scroll handlers to hotbar
    const hotbarItemboxElements = [
      ...this.hotbarContainerElement.children,
    ] as HTMLElement[];

    const onScroll = (event: WheelEvent) => {
      const direction = event.deltaY < 0;
      this.cycleHotbar(direction);

      for (let slot = 0; slot <= 8; slot++) {
        if (slot === this.getActiveHotbarSlot()) {
          console.log();
          hotbarItemboxElements[slot].style.outline = "solid 5px white";
        } else {
          hotbarItemboxElements[slot].style.outline = "";
        }
      }
    };
    document.addEventListener("wheel", onScroll);
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
    if (this.activeHotbarSlot > inventoryCols - 1) {
      this.activeHotbarSlot = 0;
    }
    if (this.activeHotbarSlot < 0) {
      this.activeHotbarSlot = inventoryCols - 1;
    }
  }
  getActiveHotbarSlot() {
    return this.activeHotbarSlot;
  }
  selectFromActiveHotbarSlot() {
    return this.hotbarSlots[this.activeHotbarSlot - 1] || air;
  }
}
