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

export const itemImages = {
  [blocks.grass]: "/assets/grass-item.png",
  [blocks.dirt]: "/assets/dirt-item.png",
  [blocks.stone]: "/assets/stone-item.png",
  [blocks.gold]: "/assets/gold-item.png",
  [blocks.lapis]: "/assets/lapis-item.png",
  [blocks.diamond]: "/assets/diamond-item.png",
  [blocks.emerald]: "/assets/emerald-item.png",
  [blocks.iron]: "/assets/iron-item.png",
  [blocks.coal]: "/assets/coal-item.png",
  [blocks.birchwood]: "/assets/birchwood-item.png",
  [blocks.oakwood]: "/assets/oakwood-item.png",
  // [blocks.foliage]: foliageItem,
  // [blocks.cactus]: cactusItem,
};
