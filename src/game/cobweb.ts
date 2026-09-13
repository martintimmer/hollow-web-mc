export const COBWEB_ID = 259;
export const COBWEB_SPARSE_ID = 1207;
export const COBWEB_DENSE_ID = 1208;
export const SPIDER_EGG_ID = 1209;
export const MUG_ID = 1210;

export const COBWEB_IDS: ReadonlySet<number> = new Set([
  COBWEB_ID,
  COBWEB_SPARSE_ID,
  COBWEB_DENSE_ID,
]);

export const isCobwebId = (id: number): boolean => COBWEB_IDS.has(id);
