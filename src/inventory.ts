import { blocks, itemImages } from "./blocks";
import { Swappable } from "@shopify/draggable";

const {
  gold,
  birchwood,
  coal,
  stone,
  iron,
  lapis,
  cactus,
  emerald,
  foliage,
  air,
} = blocks;

const initialHotbar = [
  { itemType: birchwood, amount: 0 },
  { itemType: coal, amount: 0 },
  { itemType: stone, amount: 0 },
  { itemType: iron, amount: 0 },
  { itemType: lapis, amount: 0 },
  { itemType: gold, amount: 0 },
  { itemType: emerald, amount: 0 },
  { itemType: cactus, amount: 0 },
  { itemType: foliage, amount: 0 },
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
const maxItemStack = 128;

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const makeInventoryNode = (itemType: number, amount: number) => {
  const node = document.createElement("div");
  const secondNode = document.createElement("span");

  node.setAttribute("class", "centered");
  secondNode.setAttribute("class", "inventoryItem");
  secondNode.dataset.amount = `${amount}`;
  secondNode.dataset.itemType = `${itemType}`;

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
      itemType: air,
      amount: 0,
    });
    this.hotbarSlots = initialHotbar;

    for (let slot of this.slots) {
      const node = makeInventoryNode(slot.itemType, 0);
      this.containerElement.appendChild(node);
    }
    for (let hotbarSlot of this.hotbarSlots) {
      const node = makeInventoryNode(hotbarSlot.itemType, 0);
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

    console.log(hotbarItemboxElements);
    console.log(
      "elem dataset",
      hotbarItemboxElements.map(
        (elem) => (elem.firstChild as HTMLElement).dataset.amount
      )
    );

    hotbarItemboxElements[0].style.outline = "solid 5px white";
    const onScroll = (event: WheelEvent) => {
      const direction = event.deltaY < 0;
      this.cycleHotbar(direction);

      for (let slot = 0; slot <= 8; slot++) {
        if (slot === this.getActiveHotbarSlot()) {
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
    const slot = this.slots.findIndex((item) => item.itemType === air);
    return { hasFreeSlot: slot !== 1, index: slot };
  }

  toggle() {
    this.element.style.display = this.isOpen ? "none" : "flex";
    this.isOpen = !this.isOpen;
  }

  canFitIntoSameSlot() {}

  addTo(itemType: number, amount: number) {
    const { hasFreeSlot, index } = this.findFreeSlot();
    if (hasFreeSlot) {
      this.slots[index] = { itemType, amount };
    }
  }

  private hotbarSlots: HotbarContents;
  private activeHotbarSlot = 0;

  changeHotbarItem(itemType: number, amount: number, hotbarIndex: number) {
    this.hotbarSlots[hotbarIndex] = { itemType, amount };
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
    const hotbarSlots = (
      [...this.hotbarContainerElement.children] as HTMLElement[]
    )
      .map((element) => element.firstChild as HTMLElement)
      .map(
        (element) =>
          ({
            itemType: parseInt(element.dataset.itemType),
            amount: parseInt(element.dataset.amount),
          } as InventorySlot)
      ) as HotbarContents;

    return hotbarSlots[this.activeHotbarSlot].itemType;
  }
}
