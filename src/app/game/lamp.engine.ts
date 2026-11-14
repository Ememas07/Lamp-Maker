import {
  BASE_SHAPES,
  BULBS,
  FUNCTIONALITIES,
  GATHER_ZONES,
  MATERIALS,
  ORDER_POOL,
  SHADE_SHAPES,
  SHOWROOM_VISITORS_POOL,
  STEMS,
} from './lamp.catalog';
import {
  CraftedLamp,
  CustomerOrder,
  GatherZoneId,
  LampBlueprint,
  LampMetrics,
  LampStyle,
  MaterialId,
  MaterialInventory,
  OrderEvaluation,
  ShowroomOffer,
  ShowroomPedestal,
} from './lamp.types';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Converts Kelvin color temperature (1700K - 6500K) to an RGB tint
 * based on Tanner Helland's blackbody approximation.
 */
export function kelvinToRgb(kelvin: number): {r: number; g: number; b: number} {
  const k = clamp(kelvin, 1500, 6500) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (k <= 66) {
    r = 255;
    g = clamp(99.4708025861 * Math.log(k) - 161.1195681661, 0, 255);
    b =
      k <= 19
        ? 0
        : clamp(138.5177312231 * Math.log(k - 10) - 305.0447927307, 0, 255);
  } else {
    r = clamp(329.698727446 * Math.pow(k - 60, -0.1332047592), 0, 255);
    g = clamp(288.1221695283 * Math.pow(k - 60, -0.0755148492), 0, 255);
    b = 255;
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

export function computeLampMetrics(blueprint: LampBlueprint): LampMetrics {
  const baseShape =
    BASE_SHAPES.find((b) => b.id === blueprint.baseShapeId) ?? BASE_SHAPES[0];
  const baseMat = MATERIALS[blueprint.baseMaterialId];
  const stem = STEMS.find((s) => s.id === blueprint.stemId) ?? STEMS[0];
  const func =
    FUNCTIONALITIES.find((f) => f.id === blueprint.functionalityId) ??
    FUNCTIONALITIES[0];
  const bulb = BULBS.find((b) => b.id === blueprint.bulbId) ?? BULBS[0];
  const shadeShape =
    SHADE_SHAPES.find((s) => s.id === blueprint.shadeShapeId) ??
    SHADE_SHAPES[0];
  const shadeMat = MATERIALS[blueprint.shadeMaterialId];

  const effectiveKelvin = clamp(
    Math.round(bulb.kelvin + shadeMat.warmthShift + baseMat.warmthShift * 0.25),
    1600,
    5800
  );

  const dimmerRatio = func.allowsDimmer
    ? clamp(blueprint.dimmerLevel, 15, 100) / 100
    : 1.0;

  // Translucent shades lose less lumens to absorption than thick dark metal
  const shadeEfficiency = 0.68 + shadeMat.translucency * 0.34;
  const effectiveLumens = Math.round(
    bulb.baseLumens * func.lumenMultiplier * shadeEfficiency * dimmerRatio
  );

  const styleCounts = new Map<LampStyle, number>();
  const addStyles = (list: LampStyle[], weight: number) => {
    for (const s of list) {
      styleCounts.set(s, (styleCounts.get(s) ?? 0) + weight);
    }
  };
  addStyles(baseShape.styles, 1.0);
  addStyles(baseMat.styles, 1.4);
  addStyles(stem.styles, 0.9);
  addStyles(shadeShape.styles, 1.2);
  addStyles(shadeMat.styles, 1.6);

  const sortedStyles = [...styleCounts.entries()].sort((a, b) => b[1] - a[1]);
  const dominantStyle = sortedStyles[0]?.[0] ?? 'Warm Heritage';
  const styles = sortedStyles.slice(0, 3).map(([s]) => s);

  const hardwareCost =
    baseShape.craftCost +
    stem.craftCost +
    func.craftCost +
    bulb.craftCost +
    shadeShape.craftCost;

  const materialValue = baseMat.craftValue + shadeMat.craftValue;
  const styleSynergyBonus = (sortedStyles[0]?.[1] ?? 1) >= 3.2 ? 14 : 6;
  const craftScore = clamp(
    Math.round(35 + materialValue * 0.35 + styleSynergyBonus),
    30,
    100
  );

  const estimatedValue = Math.round(
    hardwareCost * 1.3 + materialValue * 1.45 + styleSynergyBonus * 2
  );

  return {
    effectiveKelvin,
    effectiveLumens,
    beamAngleDeg: shadeShape.beamAngleDeg,
    diffusion: shadeMat.diffusion,
    translucency: shadeMat.translucency,
    uplightRatio: func.uplightRatio,
    dominantStyle,
    styles,
    craftScore,
    estimatedValue,
    materialCost: hardwareCost,
    lightColorRgb: kelvinToRgb(effectiveKelvin),
  };
}

export function getRequiredMaterialsForBlueprint(
  blueprint: LampBlueprint
): {materialId: MaterialId; count: number}[] {
  if (blueprint.baseMaterialId === blueprint.shadeMaterialId) {
    return [{materialId: blueprint.baseMaterialId, count: 2}];
  }
  return [
    {materialId: blueprint.baseMaterialId, count: 1},
    {materialId: blueprint.shadeMaterialId, count: 1},
  ];
}

export function hasMaterialsForBlueprint(
  inventory: MaterialInventory,
  blueprint: LampBlueprint
): boolean {
  const reqs = getRequiredMaterialsForBlueprint(blueprint);
  return reqs.every((r) => (inventory[r.materialId] ?? 0) >= r.count);
}

export function consumeMaterialsForBlueprint(
  inventory: MaterialInventory,
  blueprint: LampBlueprint
): MaterialInventory {
  const next = {...inventory};
  for (const req of getRequiredMaterialsForBlueprint(blueprint)) {
    next[req.materialId] = Math.max(0, (next[req.materialId] ?? 0) - req.count);
  }
  return next;
}

export function gatherFromZone(
  zoneId: GatherZoneId,
  seed: number
): {materialId: MaterialId; quantity: number}[] {
  const zone = GATHER_ZONES.find((z) => z.id === zoneId) ?? GATHER_ZONES[0];
  const idxA = Math.abs(seed) % zone.yields.length;
  const idxB = Math.abs(seed + 1) % zone.yields.length;
  const primary = zone.yields[idxA];
  const secondary = zone.yields[idxB];

  if (primary === secondary) {
    return [{materialId: primary, quantity: 2}];
  }
  return [
    {materialId: primary, quantity: 1},
    {materialId: secondary, quantity: 1},
  ];
}

export function evaluateOrderFulfillment(
  blueprint: LampBlueprint,
  metrics: LampMetrics,
  order: CustomerOrder
): OrderEvaluation {
  const styleMatched =
    metrics.dominantStyle === order.preferredStyle ||
    metrics.styles.includes(order.preferredStyle);

  const materialMatched = order.requiredMaterial
    ? blueprint.baseMaterialId === order.requiredMaterial ||
      blueprint.shadeMaterialId === order.requiredMaterial
    : true;

  const functionalityMatched = order.requiredFunctionality
    ? blueprint.functionalityId === order.requiredFunctionality
    : true;

  const kelvinMatched =
    metrics.effectiveKelvin >= order.kelvinRange[0] &&
    metrics.effectiveKelvin <= order.kelvinRange[1];

  const lumensMatched =
    metrics.effectiveLumens >= order.lumensRange[0] &&
    metrics.effectiveLumens <= order.lumensRange[1];

  let score = 0;
  if (styleMatched) score += 25;
  if (materialMatched) score += 25;
  if (functionalityMatched) score += 20;
  if (kelvinMatched) score += 15;
  else {
    const dist =
      metrics.effectiveKelvin < order.kelvinRange[0]
        ? order.kelvinRange[0] - metrics.effectiveKelvin
        : metrics.effectiveKelvin - order.kelvinRange[1];
    if (dist <= 450) score += 8;
  }
  if (lumensMatched) score += 15;
  else {
    const dist =
      metrics.effectiveLumens < order.lumensRange[0]
        ? order.lumensRange[0] - metrics.effectiveLumens
        : metrics.effectiveLumens - order.lumensRange[1];
    if (dist <= 180) score += 8;
  }

  score = clamp(score, 0, 100);
  const stars: 1 | 2 | 3 = score >= 85 ? 3 : score >= 55 ? 2 : 1;

  const multiplier = stars === 3 ? 1.2 : stars === 2 ? 0.9 : 0.55;
  const coinsEarned = Math.round(
    order.rewardCoins * multiplier + metrics.craftScore * 0.25
  );
  const reputationEarned = Math.round(order.rewardReputation * multiplier);

  const verdict =
    stars === 3
      ? 'Masterwork — meets every nuance of the brief.'
      : stars === 2
        ? 'Well crafted — minor variance from the specification.'
        : 'Accepted with reservations — lighting missed key brief goals.';

  return {
    score,
    stars,
    styleMatched,
    materialMatched,
    functionalityMatched,
    kelvinMatched,
    lumensMatched,
    coinsEarned,
    reputationEarned,
    verdict,
  };
}

export function pickReplacementOrders(
  reputation: number,
  excludeIds: string[],
  count: number
): CustomerOrder[] {
  const maxTier = reputation >= 120 ? 3 : reputation >= 45 ? 2 : 1;
  const eligible = ORDER_POOL.filter(
    (o) => o.tier <= maxTier && !excludeIds.includes(o.id)
  );
  const fallback = ORDER_POOL.filter((o) => !excludeIds.includes(o.id));
  const pool = eligible.length >= count ? eligible : fallback.length > 0 ? fallback : ORDER_POOL;
  return pool.slice(0, count);
}

export function computeShowroomAdmiration(
  pedestals: ShowroomPedestal[],
  lamps: CraftedLamp[]
): {totalScore: number; litCount: number; placedCount: number} {
  let totalScore = 0;
  let litCount = 0;
  let placedCount = 0;

  for (const p of pedestals) {
    if (!p.lampId) continue;
    const lamp = lamps.find((l) => l.id === p.lampId);
    if (!lamp) continue;
    placedCount++;
    const litBonus = p.isLit ? 1.3 : 0.75;
    if (p.isLit) litCount++;
    totalScore += Math.round(
      lamp.metrics.craftScore * p.prestigeMultiplier * litBonus
    );
  }

  return {totalScore, litCount, placedCount};
}

export function generateShowroomOffer(
  pedestals: ShowroomPedestal[],
  lamps: CraftedLamp[],
  reputation: number,
  seed: number
): ShowroomOffer | null {
  const displayed = pedestals
    .filter((p) => p.lampId !== null)
    .map((p) => ({
      pedestal: p,
      lamp: lamps.find((l) => l.id === p.lampId && !l.soldTo),
    }))
    .filter((entry): entry is {pedestal: ShowroomPedestal; lamp: CraftedLamp} =>
      Boolean(entry.lamp)
    );

  if (displayed.length === 0) return null;

  const target = displayed[Math.abs(seed) % displayed.length];
  const visitor =
    SHOWROOM_VISITORS_POOL[Math.abs(seed + 2) % SHOWROOM_VISITORS_POOL.length];

  const styleBonus = visitor.preferredStyles.includes(
    target.lamp.metrics.dominantStyle
  )
    ? 1.18
    : 1.0;
  const litBonus = target.pedestal.isLit ? 1.12 : 0.92;
  const repBonus = 1 + Math.min(0.35, reputation / 500);

  const offeredCoins = Math.round(
    target.lamp.metrics.estimatedValue *
      target.pedestal.prestigeMultiplier *
      styleBonus *
      litBonus *
      repBonus
  );

  return {
    id: `offer_${Date.now()}_${Math.abs(seed)}`,
    visitorName: visitor.name,
    visitorRole: visitor.role,
    lampId: target.lamp.id,
    lampName: target.lamp.blueprint.name,
    slotIndex: target.pedestal.slotIndex,
    offeredCoins,
    comment: target.pedestal.isLit
      ? `The ${target.lamp.metrics.dominantStyle.toLowerCase()} glow on "${target.lamp.blueprint.name}" would elevate our space.`
      : `I admire the silhouette of "${target.lamp.blueprint.name}" on the ${target.pedestal.label}.`,
  };
}
