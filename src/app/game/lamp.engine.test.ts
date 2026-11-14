import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_BLUEPRINT, INITIAL_PEDESTALS, ORDER_POOL, STARTER_INVENTORY} from './lamp.catalog';
import {
  computeLampMetrics,
  computeShowroomAdmiration,
  consumeMaterialsForBlueprint,
  evaluateOrderFulfillment,
  gatherFromZone,
  generateShowroomOffer,
  hasMaterialsForBlueprint,
  kelvinToRgb,
} from './lamp.engine';
import {CraftedLamp, LampBlueprint, ShowroomPedestal} from './lamp.types';

test('kelvinToRgb shifts from warm amber to cool daylight', () => {
  const warm = kelvinToRgb(2000);
  const cool = kelvinToRgb(5500);
  assert.equal(warm.r, 255);
  assert.ok(warm.b < 100);
  assert.ok(cool.b > 210);
});

test('computeLampMetrics responds to dimmer, functionality, and shade material', () => {
  const highDimmer = computeLampMetrics({
    ...INITIAL_BLUEPRINT,
    functionalityId: 'rotary_dimmer',
    dimmerLevel: 100,
    shadeMaterialId: 'opaline_glass',
  });
  const lowDimmer = computeLampMetrics({
    ...INITIAL_BLUEPRINT,
    functionalityId: 'rotary_dimmer',
    dimmerLevel: 30,
    shadeMaterialId: 'stained_glass',
  });

  assert.ok(highDimmer.effectiveLumens > lowDimmer.effectiveLumens);
  assert.ok(highDimmer.effectiveKelvin > lowDimmer.effectiveKelvin);
  assert.equal(lowDimmer.dominantStyle, 'Warm Heritage');
});

test('material consumption deducts both base and shade materials cleanly', () => {
  const inv = {...STARTER_INVENTORY};
  const bp: LampBlueprint = {
    ...INITIAL_BLUEPRINT,
    baseMaterialId: 'oak',
    shadeMaterialId: 'oak',
  };
  assert.equal(hasMaterialsForBlueprint(inv, bp), true);
  const next = consumeMaterialsForBlueprint(inv, bp);
  assert.equal(next.oak, STARTER_INVENTORY.oak - 2);
});

test('gatherFromZone returns valid materials from the chosen zone', () => {
  const yieldItems = gatherFromZone('glassworks', 0);
  assert.ok(yieldItems.length >= 1);
  const totalQty = yieldItems.reduce((sum, item) => sum + item.quantity, 0);
  assert.equal(totalQty, 2);
});

test('evaluateOrderFulfillment awards 3 stars when all requirements match', () => {
  const order = ORDER_POOL[0]; // Elena: Warm Heritage, oak, rotary_dimmer, 2100..2800K, 380..680lm
  const bp: LampBlueprint = {
    ...INITIAL_BLUEPRINT,
    baseMaterialId: 'oak',
    shadeMaterialId: 'linen',
    functionalityId: 'rotary_dimmer',
    bulbId: 'warm_globe',
    dimmerLevel: 85,
  };
  const metrics = computeLampMetrics(bp);
  const evalResult = evaluateOrderFulfillment(bp, metrics, order);

  assert.equal(evalResult.styleMatched, true);
  assert.equal(evalResult.materialMatched, true);
  assert.equal(evalResult.functionalityMatched, true);
  assert.equal(evalResult.kelvinMatched, true);
  assert.equal(evalResult.lumensMatched, true);
  assert.equal(evalResult.stars, 3);
  assert.ok(evalResult.coinsEarned > order.rewardCoins);
});

test('showroom admiration and offer generation reward lit hero placements', () => {
  const metrics = computeLampMetrics(INITIAL_BLUEPRINT);
  const lamp: CraftedLamp = {
    id: 'lamp_1',
    createdAt: 1000,
    blueprint: INITIAL_BLUEPRINT,
    metrics,
    likes: 0,
    admirationEarned: 0,
  };

  const pedestals: ShowroomPedestal[] = INITIAL_PEDESTALS.map((p, i) =>
    i === 1 ? {...p, lampId: lamp.id, isLit: true} : p
  );

  const stats = computeShowroomAdmiration(pedestals, [lamp]);
  assert.equal(stats.placedCount, 1);
  assert.equal(stats.litCount, 1);
  assert.ok(stats.totalScore > 50);

  const offer = generateShowroomOffer(pedestals, [lamp], 50, 3);
  assert.ok(offer !== null);
  assert.equal(offer.lampId, lamp.id);
  assert.ok(offer.offeredCoins >= lamp.metrics.estimatedValue);
});
