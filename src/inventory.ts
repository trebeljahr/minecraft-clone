import { blocks, itemImages } from "./blocks";
import { Swappable } from "@shopify/draggable";

const {
  gold,
  birchwood,
  coal,
  stone,
  iron,
  lapis,
  grass,
  emerald,
  oakwood,
  air,
} = blocks;

const maxItemStack = 128;
const initialHotbar = [
  { itemType: oakwood, amount: 1 },
  { itemType: birchwood, amount: maxItemStack },
  { itemType: coal, amount: maxItemStack },
  { itemType: stone, amount: maxItemStack },
  { itemType: iron, amount: maxItemStack },
  { itemType: lapis, amount: maxItemStack },
  { itemType: gold, amount: maxItemStack },
  { itemType: emerald, amount: maxItemStack },
  { itemType: grass, amount: maxItemStack },
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
  itemType: number;
}

const inventoryRows = 5;
const inventoryCols = 9;

const makeInventoryNode = (itemType: number, amount: number) => {
  const inventorySlotNode = document.createElement("div");
  const itemNode = document.createElement("span");

  inventorySlotNode.setAttribute("class", "centered");
  itemNode.setAttribute("class", "inventoryItem");
  if (itemType !== air) {
    itemNode.dataset.amount = `${amount}`;
    itemNode.dataset.itemType = `${itemType}`;
  }

  const image = itemImages[itemType];
  if (image !== undefined && image !== "") {
    itemNode.style.backgroundImage = `url(${image})`;
  }
  inventorySlotNode.appendChild(itemNode);

  return inventorySlotNode;
};

export class Inventory {
  public isOpen = false;
  private slots: InventorySlot[];
  private hotbarSlots: HotbarContents;
  private activeHotbarSlot = 0;

  constructor() {
    this.slots = Array(inventoryRows * inventoryCols).fill({
      itemType: air,
      amount: 0,
    });
    this.hotbarSlots = initialHotbar;

    for (let slot of this.slots) {
      const node = makeInventoryNode(slot.itemType, 0);
      this.containerElement.appendChild(node);
    }
    for (let hotbarSlot of this.hotbarSlots) {
      const node = makeInventoryNode(hotbarSlot.itemType, hotbarSlot.amount);
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
        if (slot === this.activeHotbarSlot) {
          hotbarItemboxElements[slot].style.outline = "solid 5px white";
        } else {
          hotbarItemboxElements[slot].style.outline = "";
        }
      }
    };
    document.addEventListener("wheel", onScroll);
  }

  findFreeSlot() {
    const slot = this.slots.findIndex((item) => item.itemType === air);
    return { hasFreeSlot: slot !== 1, index: slot };
  }

  toggle() {
    this.element.style.display = this.isOpen ? "none" : "flex";
    this.isOpen = !this.isOpen;
  }

  canFitIntoSameSlot(index: number) {
    this.getInventorySlot(index);
  }

  addTo(itemType: number, amount: number) {
    const { hasFreeSlot, index } = this.findFreeSlot();
    if (hasFreeSlot) {
      this.slots[index] = { itemType, amount };
    }
  }

  changeHotbarItem(itemType: number, amount: number, hotbarIndex: number) {
    this.hotbarSlots[hotbarIndex] = { itemType, amount };
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

  parse({ amount, itemType }: Record<string, string>) {
    return { amount: parseInt(amount), itemType: parseInt(itemType) };
  }

  selectFromActiveHotbarSlot() {
    const { amount, itemType } = this.parse(this.activeHotbarElement.dataset);

    if (isNaN(itemType)) {
      return air;
    }
    const newAmount = amount - 1;
    if (newAmount === 0) {
      delete this.activeHotbarElement.dataset.amount;
      delete this.activeHotbarElement.dataset.itemType;
      this.activeHotbarElement.style.backgroundImage = "";
    } else {
      this.activeHotbarElement.dataset.amount = `${amount - 1}`;
    }
    return itemType;
  }

  get containerElement() {
    return document.getElementById("inventoryContainer");
  }

  get element() {
    return document.getElementById("inventory");
  }
  get hotbarElement() {
    return document.getElementById("hotbar");
  }

  get hotbarContainerElement() {
    return document.getElementById("hotbarContainer");
  }

  get hotbarItemSlotElements() {
    return [...this.hotbarContainerElement.children] as HTMLElement[];
  }
  get activeHotbarElement() {
    return this.getHotbarSlot(this.activeHotbarSlot);
  }

  get inventoryItemSlotElements() {
    return [...this.containerElement.children] as HTMLElement[];
  }

  getInventorySlot(index: number) {
    return this.inventoryItemSlotElements[index].firstChild as HTMLElement;
  }
  getHotbarSlot(index: number) {
    return this.hotbarItemSlotElements[index].firstChild as HTMLElement;
  }
}
