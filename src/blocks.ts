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
  [blocks.grass]: require("../assets/grass-item.png"),
  [blocks.dirt]: require("../assets/dirt-item.png"),
  [blocks.stone]: require("../assets/stone-item.png"),
  [blocks.gold]: require("../assets/gold-item.png"),
  [blocks.lapis]: require("../assets/lapis-item.png"),
  [blocks.diamond]: require("../assets/diamond-item.png"),
  [blocks.emerald]: require("../assets/emerald-item.png"),
  [blocks.iron]: require("../assets/iron-item.png"),
  [blocks.coal]: require("../assets/coal-item.png"),
  [blocks.birchwood]: require("../assets/birchwood-item.png"),
  [blocks.oakwood]: require("../assets/oakwood-item.png"),
  [blocks.foliage]: "", //  require("../assets/foliage-item.png"),
  [blocks.cactus]: "", // require("../assets/cactus-item.png"),
};
