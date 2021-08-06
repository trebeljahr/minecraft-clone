import { blocks, itemImages } from "./blocks";
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
  { blockType: birchwood, amount: 0 },
  { blockType: oakwood, amount: 0 },
  { blockType: stone, amount: 0 },
  { blockType: iron, amount: 0 },
  { blockType: lapis, amount: 0 },
  { blockType: gold, amount: 0 },
  { blockType: emerald, amount: 0 },
  { blockType: cactus, amount: 0 },
  { blockType: foliage, amount: 0 },
] as HotbarContents;

type HotbarContents = [
  InventorySlot,
  InventorySlot,
  InventorySlot,
  InventorySlot,
  InventorySlot,
  InventorySlot,
  InventorySlot,
  InventorySlot,
  InventorySlot
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

const makeInventoryNode = (itemType: number) => {
  const node = document.createElement("div");
  const secondNode = document.createElement("span");

  node.setAttribute("class", "centered");
  secondNode.setAttribute("class", "inventoryItem");
  const image = itemImages[itemType];
  image !== "" &&
    image !== undefined &&
    console.log("This is the asset url", image);
  if (image !== undefined && image !== "") {
    secondNode.style.backgroundImage = `url(${image})`;
  }
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

    for (let slot of this.slots) {
      const node = makeInventoryNode(slot.blockType);
      this.containerElement.appendChild(node);
    }
    for (let hotbarSlot of this.hotbarSlots) {
      const node = makeInventoryNode(hotbarSlot.blockType);
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

    hotbarItemboxElements[0].style.outline = "solid 5px white";
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
  private activeHotbarSlot = 0;

  changeHotbarItem(blockType: number, amount: number, hotbarIndex: number) {
    this.hotbarSlots[hotbarIndex] = { blockType, amount };
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
    return this.hotbarSlots[this.activeHotbarSlot].blockType || air;
  }
}
