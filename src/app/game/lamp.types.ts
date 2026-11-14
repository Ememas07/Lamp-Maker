export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type WorkshopTab = 'workbench' | 'orders' | 'materials' | 'showroom';

export type PartCategory = 'base' | 'stem' | 'bulb' | 'shade';

export type MaterialId =
  | 'oak'
  | 'walnut'
  | 'brass'
  | 'copper'
  | 'iron'
  | 'travertine'
  | 'terracotta'
  | 'linen'
  | 'stained_glass'
  | 'opaline_glass'
  | 'rattan'
  | 'smoked_glass';

export type LampStyle =
  | 'Warm Heritage'
  | 'Mid-Century'
  | 'Industrial'
  | 'Botanical'
  | 'Tiffany Art'
  | 'Minimalist';

export type BaseShapeId =
  | 'turned_pedestal'
  | 'tripod_stand'
  | 'sculptural_urn'
  | 'weighted_disc';

export type StemId =
  | 'straight_column'
  | 'goose_neck'
  | 'cantilever_arc'
  | 'counterweight_pulley';

export type FunctionalityId =
  | 'pull_chain'
  | 'rotary_dimmer'
  | 'pivot_task_arm'
  | 'ambient_uplight';

export type BulbId =
  | 'ember_filament'
  | 'edison_cage'
  | 'warm_globe'
  | 'halogen_clear'
  | 'studio_led';

export type ShadeShapeId =
  | 'pleated_drum'
  | 'tiffany_dome'
  | 'spun_cone'
  | 'glass_orb'
  | 'woven_bell';

export type RoomSettingId =
  | 'reading_nook'
  | 'jazz_study'
  | 'sunroom'
  | 'drafting_loft'
  | 'dining_alcove';

export type GatherZoneId =
  | 'timber_mill'
  | 'foundry_yard'
  | 'glassworks'
  | 'woven_quarter';

export interface MaterialSpec {
  id: MaterialId;
  name: string;
  category: 'structural' | 'diffuser' | 'both';
  buyPrice: number;
  gatherZoneId: GatherZoneId;
  colorHex: string;
  accentHex: string;
  warmthShift: number;
  diffusion: number; // 0..1
  translucency: number; // 0..1
  craftValue: number;
  styles: LampStyle[];
  description: string;
}

export interface GatherZone {
  id: GatherZoneId;
  name: string;
  subtitle: string;
  yields: MaterialId[];
  energyCost: number;
}

export interface BaseShapeSpec {
  id: BaseShapeId;
  name: string;
  craftCost: number;
  styles: LampStyle[];
  description: string;
}

export interface StemSpec {
  id: StemId;
  name: string;
  craftCost: number;
  heightFactor: number; // 0.8..1.35
  styles: LampStyle[];
  description: string;
}

export interface FunctionalitySpec {
  id: FunctionalityId;
  name: string;
  craftCost: number;
  lumenMultiplier: number;
  uplightRatio: number;
  allowsDimmer: boolean;
  allowsTilt: boolean;
  description: string;
}

export interface BulbSpec {
  id: BulbId;
  name: string;
  kelvin: number;
  baseLumens: number;
  craftCost: number;
  filamentColor: string;
  description: string;
}

export interface ShadeShapeSpec {
  id: ShadeShapeId;
  name: string;
  craftCost: number;
  beamAngleDeg: number; // 35..180
  styles: LampStyle[];
  description: string;
}

export interface LampBlueprint {
  name: string;
  baseShapeId: BaseShapeId;
  baseMaterialId: MaterialId;
  stemId: StemId;
  functionalityId: FunctionalityId;
  bulbId: BulbId;
  shadeShapeId: ShadeShapeId;
  shadeMaterialId: MaterialId;
  shadeTintHex: string;
  dimmerLevel: number; // 15..100
  shadeTiltDeg: number; // -35..35
  stemHeightPct: number; // 0..100
  isLit: boolean;
}

export interface LampMetrics {
  effectiveKelvin: number;
  effectiveLumens: number;
  beamAngleDeg: number;
  diffusion: number;
  translucency: number;
  uplightRatio: number;
  dominantStyle: LampStyle;
  styles: LampStyle[];
  craftScore: number; // 1..100
  estimatedValue: number;
  materialCost: number;
  lightColorRgb: {r: number; g: number; b: number};
}

export interface CraftedLamp {
  id: string;
  createdAt: number;
  blueprint: LampBlueprint;
  metrics: LampMetrics;
  likes: number;
  admirationEarned: number;
  soldTo?: string;
  soldPrice?: number;
}

export interface CustomerOrder {
  id: string;
  clientName: string;
  clientRole: string;
  roomSetting: RoomSettingId;
  dialogue: string;
  preferredStyle: LampStyle;
  requiredMaterial?: MaterialId;
  requiredFunctionality?: FunctionalityId;
  kelvinRange: [number, number];
  lumensRange: [number, number];
  rewardCoins: number;
  rewardReputation: number;
  tier: 1 | 2 | 3;
}

export interface OrderEvaluation {
  score: number; // 0..100
  stars: 1 | 2 | 3;
  styleMatched: boolean;
  materialMatched: boolean;
  functionalityMatched: boolean;
  kelvinMatched: boolean;
  lumensMatched: boolean;
  coinsEarned: number;
  reputationEarned: number;
  verdict: string;
}

export interface ShowroomPedestal {
  slotIndex: number;
  label: string;
  zoneHint: string;
  prestigeMultiplier: number;
  lampId: string | null;
  isLit: boolean;
}

export interface ShowroomVisitor {
  id: string;
  name: string;
  role: string;
  targetSlot: number;
  xPct: number; // 8..92
  coatColor: string;
  thought: string;
  offerLampId?: string;
  offerPrice?: number;
  offerResolved?: boolean;
}

export interface ShowroomOffer {
  id: string;
  visitorName: string;
  visitorRole: string;
  lampId: string;
  lampName: string;
  slotIndex: number;
  offeredCoins: number;
  comment: string;
}

export type MaterialInventory = Record<MaterialId, number>;
