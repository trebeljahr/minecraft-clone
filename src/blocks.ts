export const blocks = {
  stone: 12,
  grass: 1,
  dirt: 14,
  gold: 6,
  coal: 7,
  lapis: 9,
  diamond: 15,
  emerald: 17,
  iron: 19,
  birchwood: 20,
  oakwood: 3,
  foliage: 2,
  cactus: 18,
  air: 0,
};

const swappedEntries = Object.entries(blocks).map(([key, value]) => [
  value,
  key,
]);

export const blocksLookup: Record<string, number> =
  Object.fromEntries(swappedEntries);

export const tools = {
  axe: 0,
  pickaxe: 1,
  shovel: 2,
};

export const hardness: Record<number, number> = {
  [blocks.grass]: tools.shovel,
  [blocks.dirt]: tools.shovel,
  [blocks.stone]: tools.pickaxe,
  [blocks.gold]: tools.pickaxe,
  [blocks.lapis]: tools.pickaxe,
  [blocks.diamond]: tools.pickaxe,
  [blocks.emerald]: tools.pickaxe,
  [blocks.iron]: tools.pickaxe,
  [blocks.birchwood]: tools.pickaxe,
  [blocks.oakwood]: tools.axe,
  [blocks.foliage]: tools.axe,
  [blocks.cactus]: tools.axe,
};

import grassItem from "./assets/grass-item.png";
import dirtItem from "./assets/dirt-item.png";
import goldItem from "./assets/gold-item.png";
import stoneItem from "./assets/stone-item.png";
import lapisItem from "./assets/lapis-item.png";
import diamondItem from "./assets/diamond-item.png";
import emeraldItem from "./assets/emerald-item.png";
import ironItem from "./assets/iron-item.png";
import coalItem from "./assets/coal-item.png";
import birchwoodItem from "./assets/birchwood-item.png";
import oakwoodItem from "./assets/oakwood-item.png";
// import foliageItem from "./assets/foliage-item.png";
// import cactusItem from "./assets/cactus-item.png";

export const itemImages = {
  [blocks.grass]: grassItem,
  [blocks.dirt]: dirtItem,
  [blocks.stone]: stoneItem,
  [blocks.gold]: goldItem,
  [blocks.lapis]: lapisItem,
  [blocks.diamond]: diamondItem,
  [blocks.emerald]: emeraldItem,
  [blocks.iron]: ironItem,
  [blocks.coal]: coalItem,
  [blocks.birchwood]: birchwoodItem,
  [blocks.oakwood]: oakwoodItem,
  // [blocks.foliage]: foliageItem,
  // [blocks.cactus]: cactusItem,
};
