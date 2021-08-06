export const blocks = {
  stone: 12,
  grass: 1,
  dirt: 14,
  gold: 6,
  coal: 7,
  lapis: 9,
  diamonds: 15,
  emerald: 17,
  iron: 19,
  birchwood: 20,
  oakwood: 3,
  foliage: 2,
  cactus: 18,
  air: 0,
};

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
  [blocks.diamonds]: tools.pickaxe,
  [blocks.emerald]: tools.pickaxe,
  [blocks.iron]: tools.pickaxe,
  [blocks.birchwood]: tools.pickaxe,
  [blocks.oakwood]: tools.axe,
  [blocks.foliage]: tools.axe,
  [blocks.cactus]: tools.axe,
};

export const itemImages = {
  [blocks.grass]: "",
  [blocks.dirt]: "",
  [blocks.stone]: "",
  [blocks.gold]: "",
  [blocks.lapis]: "",
  [blocks.diamonds]: "",
  [blocks.emerald]: "",
  [blocks.iron]: "",
  [blocks.birchwood]: require("../assets/birchwood-item.png"),
  [blocks.oakwood]: "",
  [blocks.foliage]: "",
  [blocks.cactus]: "",
};
