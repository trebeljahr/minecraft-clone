import { blocks, itemImages } from "./blocks";
import { Swappable } from "@shopify/draggable";
import { MouseClickEvent } from "./helpers";

const throttle = (fn: Function, wait: number = 60) => {
  let inThrottle: boolean,
    lastFn: ReturnType<typeof setTimeout>,
    lastTime: number;
  return function (this: any) {
    const context = this,
      args = arguments;
    if (!inThrottle) {
      fn.apply(context, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(() => {
        if (Date.now() - lastTime >= wait) {
          fn.apply(context, args);
          lastTime = Date.now();
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
};

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

const maxItemStack = 64;
const initialHotbarSlots = [
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

const inventoryRows = 3;
const inventoryCols = 9;

export class Inventory {
  public isOpen = false;
  private inventorySlots: InventorySlot[];
  private hotbarSlots: HotbarContents;
  private activeHotbarSlot = 0;

  constructor() {
    this.inventorySlots = Array(inventoryRows * inventoryCols).fill({
      itemType: air,
      amount: 0,
    });
    this.hotbarSlots = initialHotbarSlots;

    for (let slot of this.inventorySlots) {
      const node = this.makeInventoryNode(slot.itemType, 0);
      this.inventoryElement.appendChild(node);
    }
    for (let hotbarSlot of this.hotbarSlots) {
      const node = this.makeInventoryNode(
        hotbarSlot.itemType,
        hotbarSlot.amount
      );
      this.hotbarElement.appendChild(node);
    }
    const swappableContainers = this.inventoryElement.children;
    const swappableHotbarContainers = this.hotbarElement.children;

    new Swappable([...swappableContainers, ...swappableHotbarContainers], {
      draggable: "span",
    });

    // attach scroll handlers to hotbar
    const hotbarItemboxElements = [
      ...this.hotbarElement.children,
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
    document.addEventListener("wheel", throttle(onScroll));
  }
  makeInventoryNode = (itemType: number, amount: number) => {
    const inventorySlotNode = document.createElement("div");
    const itemNode = document.createElement("span");

    inventorySlotNode.setAttribute("class", "centered");
    itemNode.setAttribute("class", "inventoryItem");
    if (itemType !== air) {
      itemNode.dataset.amount = `${amount}`;
      itemNode.dataset.itemType = `${itemType}`;
    }

    itemNode.addEventListener("click", (event) => {
      const mouseClick = new MouseClickEvent(event);
      if (mouseClick.left) {
        const { itemType } = this.parse(itemNode.dataset);
        this.addIntoInventory(itemType, 100);
      }
    });
    this.attachBlockImageTo(itemType, itemNode);
    inventorySlotNode.appendChild(itemNode);

    return inventorySlotNode;
  };

  attachBlockImageTo(itemType: number, itemNode: HTMLElement) {
    if (itemType === air) return;

    const image = itemImages[itemType];
    const imgElem = document.createElement("img");
    imgElem.src = image;
    imgElem.style.width = "100%";
    imgElem.style.height = "100%";
    imgElem.alt = `item of type ${itemType}`;

    itemNode.appendChild(imgElem);
  }

  findFreeSlot(itemTypeToInsert: number) {
    const fittingSlotIndex = this.allSlots.findIndex((item) => {
      const slot = item.firstChild as HTMLElement;

      const { itemType, amount } = this.parse(slot.dataset);

      console.log({ itemType, itemTypeToInsert, amount: amount + 1 });
      return itemType === itemTypeToInsert && amount + 1 <= maxItemStack;
    });

    if (fittingSlotIndex !== -1) {
      return {
        hasFreeSlot: true,
        isHotbarSlot: fittingSlotIndex <= 8,
        index: fittingSlotIndex,
      };
    }

    const slot = this.allSlots.findIndex((item) => {
      const slot = item.firstChild as HTMLElement;

      const { itemType } = this.parse(slot.dataset);
      return itemType === air;
    });
    return { hasFreeSlot: slot !== 1, isHotbarSlot: false, index: slot };
  }

  toggle() {
    this.inventoryElement.style.display = this.isOpen ? "none" : "flex";
    this.isOpen = !this.isOpen;
  }

  addIntoInventory(itemTypeToInsert: number, amountToInsert: number) {
    let amountLeft = amountToInsert;
    while (amountLeft > 0) {
      const hadFreeSlot = this.addTo(itemTypeToInsert);
      if (hadFreeSlot) amountLeft--;
      else {
        console.log("No free slot");
        break;
      }
    }
  }

  addTo(itemTypeToInsert: number) {
    const { hasFreeSlot, index } = this.findFreeSlot(itemTypeToInsert);
    if (hasFreeSlot) {
      const { amount } = this.parse(
        this.getInventoryOrHotbarSlot(index).dataset
      );
      const newAmount = amount + 1;
      const slot = this.getInventoryOrHotbarSlot(index);

      slot.dataset.itemType = `${itemTypeToInsert}`;
      const image = itemImages[itemTypeToInsert];

      if (image !== undefined && image !== "" && slot.children.length === 0) {
        this.attachBlockImageTo(itemTypeToInsert, slot);
      }

      slot.dataset.amount = `${newAmount}`;
    }

    return hasFreeSlot;
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

  parse({ amount: a, itemType: i }: Record<string, string>) {
    const amount = parseInt(a);
    const itemType = parseInt(i);
    console.log(amount, itemType);
    return {
      amount: isNaN(amount) ? 0 : amount,
      itemType: isNaN(itemType) ? air : itemType,
    };
  }

  takeOutItem() {
    const { amount, itemType } = this.parse(this.activeHotbarElement.dataset);

    if (itemType === air) return air;

    const newAmount = amount - 1;
    if (newAmount === 0) {
      delete this.activeHotbarElement.dataset.amount;
      delete this.activeHotbarElement.dataset.itemType;
      this.activeHotbarElement.style.backgroundImage = "";
      this.activeHotbarElement.children[0].remove();
    } else {
      this.activeHotbarElement.dataset.amount = `${amount - 1}`;
    }
  }

  getActiveItemInHotbar() {
    const { itemType } = this.parse(this.activeHotbarElement.dataset);
    return itemType;
  }

  get inventoryElement() {
    return document.getElementById("inventoryElement");
  }

  get hotbarElement() {
    return document.getElementById("hotbarElement");
  }

  get hotbarContainerElement() {
    return document.getElementById("hotbarContainerElement");
  }

  get hotbarItemSlotElements() {
    return [...this.hotbarElement.children] as HTMLElement[];
  }

  get activeHotbarElement() {
    return this.getHotbarSlot(this.activeHotbarSlot);
  }

  get inventoryItemSlotElements() {
    return [...this.inventoryElement.children] as HTMLElement[];
  }

  get allSlots() {
    return [...this.hotbarItemSlotElements, ...this.inventoryItemSlotElements];
  }

  getInventoryOrHotbarSlot(index: number) {
    return this.allSlots[index].firstChild as HTMLElement;
  }

  getInventorySlot(index: number) {
    return this.inventoryItemSlotElements[index].firstChild as HTMLElement;
  }

  getHotbarSlot(index: number) {
    return this.hotbarItemSlotElements[index].firstChild as HTMLElement;
  }
}
