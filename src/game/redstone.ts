// Redstone Logic Engine — Direct activation & Breadth-First-Search signal propagation
// Blocks:
// 435 = Lever
// 104 = Redstone lamp (off)
// 83  = Redstone lamp (lit)
// 105 = Oak door (closed)
// 106 = Oak door (open)
// 107 = Oak trapdoor (closed)
// 108 = Oak trapdoor (open)
// 591 = Redstone Block (power source 15)
// 592 = Redstone Dust Dot (unpowered or powered)

export interface RedstoneNetworkCtx {
  getBlock: (x: number, y: number, z: number) => number;
  edit: (x: number, y: number, z: number, id: number, broadcast?: boolean) => void;
  playLeverClick: (on: boolean) => void;
  playDoorUse: () => void;
  showToast: (msg: string) => void;
}

const ADJACENT_DIRS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1]
];

/** Check whether a block can receive redstone power */
export function isRedstoneReceiver(id: number): boolean {
  return id === 104 || id === 83 || id === 105 || id === 106 || id === 107 || id === 108;
}

/** Toggle direct redstone lever and update connected components */
export function toggleLever(
  x: number,
  y: number,
  z: number,
  blockDirs: Map<string, number>,
  ctx: RedstoneNetworkCtx
): boolean {
  const key = `${x},${y},${z}`;
  const curState = blockDirs.get(key) || 0;
  const nextState = curState === 1 ? 0 : 1;
  blockDirs.set(key, nextState);
  const isPowered = nextState === 1;

  ctx.playLeverClick(isPowered);
  ctx.showToast(isPowered ? "⚡ Lever ON" : "⚪ Lever OFF");

  // Power or unpower all adjacent receivers
  for (const [dx, dy, dz] of ADJACENT_DIRS) {
    const ax = x + dx, ay = y + dy, az = z + dz;
    const adjId = ctx.getBlock(ax, ay, az);

    // Redstone Lamp toggle: 104 (off) <-> 83 (lit)
    if (adjId === 104 && isPowered) {
      ctx.edit(ax, ay, az, 83);
    } else if (adjId === 83 && !isPowered) {
      ctx.edit(ax, ay, az, 104);
    }
    // Wooden Door toggle: 105 (closed) <-> 106 (open)
    else if (adjId === 105 && isPowered) {
      ctx.edit(ax, ay, az, 106);
      ctx.playDoorUse();
    } else if (adjId === 106 && !isPowered) {
      ctx.edit(ax, ay, az, 105);
      ctx.playDoorUse();
    }
    // Wooden Trapdoor toggle: 107 (closed) <-> 108 (open)
    else if (adjId === 107 && isPowered) {
      ctx.edit(ax, ay, az, 108);
      ctx.playDoorUse();
    } else if (adjId === 108 && !isPowered) {
      ctx.edit(ax, ay, az, 107);
      ctx.playDoorUse();
    }
  }

  return true;
}

/** Propagate redstone power from a source with max 15 power drop */
export function propagateRedstonePower(
  startX: number,
  startY: number,
  startZ: number,
  _maxDistance = 15,
  ctx: RedstoneNetworkCtx
) {
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number; z: number; power: number }> = [
    { x: startX, y: startY, z: startZ, power: 15 }
  ];
  visited.add(`${startX},${startY},${startZ}`);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.power <= 0) continue;

    for (const [dx, dy, dz] of ADJACENT_DIRS) {
      const nx = curr.x + dx, ny = curr.y + dy, nz = curr.z + dz;
      const nKey = `${nx},${ny},${nz}`;
      if (visited.has(nKey)) continue;
      visited.add(nKey);

      const nId = ctx.getBlock(nx, ny, nz);
      if (nId === 104) {
        // Light redstone lamp
        ctx.edit(nx, ny, nz, 83);
      } else if (nId === 592 || nId === 593 || nId === 594 || nId === 595) {
        // Redstone dust propagates power
        queue.push({ x: nx, y: ny, z: nz, power: curr.power - 1 });
      }
    }
  }
}
