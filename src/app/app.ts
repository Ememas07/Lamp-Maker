import {DOCUMENT} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {LampStage} from './components/lamp-stage';
import {MaterialsPanel} from './components/materials-panel';
import {AppraisalModal, MasteryModal, PauseModal} from './components/modals';
import {OrdersPanel} from './components/orders-panel';
import {ShowroomPanel} from './components/showroom-panel';
import {TitleScreen} from './components/title-screen';
import {WorkbenchControls} from './components/workbench-controls';
import {
  FUNCTIONALITIES,
  INITIAL_BLUEPRINT,
  INITIAL_PEDESTALS,
  MATERIALS,
  ORDER_POOL,
  SHOWROOM_VISITORS_POOL,
  STARTER_INVENTORY,
} from './game/lamp.catalog';
import {
  computeLampMetrics,
  computeShowroomAdmiration,
  consumeMaterialsForBlueprint,
  evaluateOrderFulfillment,
  gatherFromZone,
  generateShowroomOffer,
  hasMaterialsForBlueprint,
  pickReplacementOrders,
} from './game/lamp.engine';
import {
  CraftedLamp,
  CustomerOrder,
  GamePhase,
  GatherZoneId,
  LampBlueprint,
  MaterialId,
  MaterialInventory,
  OrderEvaluation,
  PartCategory,
  RoomSettingId,
  ShowroomOffer,
  ShowroomPedestal,
  ShowroomVisitor,
  WorkshopTab,
} from './game/lamp.types';
import {SoundEngine} from './game/sound';

const SAVE_KEY = 'lumen_atelier_save_v1';
const MASTERY_REP_THRESHOLD = 180;

interface SavedState {
  coins: number;
  reputation: number;
  forageStamina: number;
  ordersCompleted: number;
  salesCount: number;
  masteryAchieved: boolean;
  inventory: MaterialInventory;
  activeOrders: CustomerOrder[];
  craftedLamps: CraftedLamp[];
  pedestals: ShowroomPedestal[];
  blueprint: LampBlueprint;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    MatIconModule,
    TitleScreen,
    LampStage,
    WorkbenchControls,
    OrdersPanel,
    MaterialsPanel,
    ShowroomPanel,
    AppraisalModal,
    PauseModal,
    MasteryModal,
  ],
  templateUrl: './app.html',
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
})
export class App {
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  readonly sound = inject(SoundEngine);

  readonly phase = signal<GamePhase>('title');
  readonly activeTab = signal<WorkshopTab>('workbench');

  readonly coins = signal(180);
  readonly reputation = signal(15);
  readonly forageStamina = signal(3);
  readonly maxStamina = 3;
  readonly ordersCompleted = signal(0);
  readonly salesCount = signal(0);
  readonly masteryAchieved = signal(false);

  readonly inventory = signal<MaterialInventory>({...STARTER_INVENTORY});
  readonly blueprint = signal<LampBlueprint>({...INITIAL_BLUEPRINT});
  readonly activeOrders = signal<CustomerOrder[]>(ORDER_POOL.slice(0, 3));
  readonly pinnedOrderId = signal<string | null>(ORDER_POOL[0].id);

  readonly craftedLamps = signal<CraftedLamp[]>(this.createStarterLamps());
  readonly pedestals = signal<ShowroomPedestal[]>(
    INITIAL_PEDESTALS.map((p, idx) =>
      idx === 0 ? {...p, lampId: 'lamp_starter_1', isLit: true} : {...p}
    )
  );
  readonly visitors = signal<ShowroomVisitor[]>(this.createInitialVisitors());
  readonly offers = signal<ShowroomOffer[]>([]);

  readonly appraisalResult = signal<{
    order: CustomerOrder;
    evaluation: OrderEvaluation;
  } | null>(null);
  readonly lastGatherNote = signal<string | null>(null);
  readonly workshopToast = signal<string | null>(null);
  readonly hasSavedProgress = signal(false);

  private gatherSeed = 1;
  private offerSeed = 1;

  readonly currentMetrics = computed(() => computeLampMetrics(this.blueprint()));

  readonly pinnedOrder = computed(
    () =>
      this.activeOrders().find((o) => o.id === this.pinnedOrderId()) ?? null
  );

  readonly activeRoomSetting = computed<RoomSettingId>(
    () => this.pinnedOrder()?.roomSetting ?? 'reading_nook'
  );

  readonly pinnedOrderEval = computed(() => {
    const order = this.pinnedOrder();
    if (!order) return null;
    return evaluateOrderFulfillment(
      this.blueprint(),
      this.currentMetrics(),
      order
    );
  });

  readonly unplacedCount = computed(() => {
    const placed = new Set(
      this.pedestals()
        .map((p) => p.lampId)
        .filter((id): id is string => Boolean(id))
    );
    return this.craftedLamps().filter((l) => !l.soldTo && !placed.has(l.id))
      .length;
  });

  readonly showroomScore = computed(
    () =>
      computeShowroomAdmiration(this.pedestals(), this.craftedLamps()).totalScore
  );

  constructor() {
    effect(() => {
      const state = this.phase();
      this.doc.body.dataset['state'] = state;
    });

    afterNextRender(() => {
      this.loadSavedState();

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autostart') === '1') {
          this.phase.set('playing');
        }
      }

      // Passive showroom visitor drift + stamina recharge every 12s while playing
      const intervalId = window.setInterval(() => {
        if (this.phase() !== 'playing') return;
        this.forageStamina.update((s) => Math.min(this.maxStamina, s + 1));
        this.stepShowroomVisitors();
      }, 12000);

      this.destroyRef.onDestroy(() => {
        window.clearInterval(intervalId);
      });
    });
  }

  private createStarterLamps(): CraftedLamp[] {
    const bp: LampBlueprint = {
      ...INITIAL_BLUEPRINT,
      name: 'Oak Heritage No. 0',
      baseMaterialId: 'oak',
      shadeMaterialId: 'linen',
    };
    return [
      {
        id: 'lamp_starter_1',
        createdAt: Date.now() - 60000,
        blueprint: bp,
        metrics: computeLampMetrics(bp),
        likes: 2,
        admirationEarned: 12,
      },
    ];
  }

  private createInitialVisitors(): ShowroomVisitor[] {
    return SHOWROOM_VISITORS_POOL.slice(0, 2).map((v, idx) => ({
      id: `vis_${idx}`,
      name: v.name,
      role: v.role,
      targetSlot: idx === 0 ? 0 : 1,
      xPct: idx === 0 ? 18 : 42,
      coatColor: v.coatColor,
      thought: 'Warm craftsmanship',
    }));
  }

  onKeyDown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (this.phase() === 'title') {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.startWorkshop();
      }
      return;
    }

    if (this.phase() === 'paused') {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        event.preventDefault();
        this.resumeWorkshop();
      }
      return;
    }

    if (this.phase() === 'playing') {
      if (event.key === 'Escape' || (!isInput && event.key.toLowerCase() === 'p')) {
        event.preventDefault();
        this.pauseWorkshop();
        return;
      }
      if (!isInput && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        this.sound.toggleMute();
        return;
      }
      if (!isInput && event.key === ' ' && this.activeTab() === 'workbench') {
        event.preventDefault();
        this.toggleLampPower();
      }
    }
  }

  startWorkshop(): void {
    if (this.doc.activeElement instanceof HTMLElement) {
      this.doc.activeElement.blur();
    }
    this.sound.playSwitchClick(true);
    this.phase.set('playing');
  }

  pauseWorkshop(): void {
    this.phase.set('paused');
  }

  resumeWorkshop(): void {
    this.phase.set('playing');
  }

  backToTitle(): void {
    this.phase.set('title');
  }

  resetCareer(): void {
    this.coins.set(180);
    this.reputation.set(15);
    this.forageStamina.set(3);
    this.ordersCompleted.set(0);
    this.salesCount.set(0);
    this.masteryAchieved.set(false);
    this.inventory.set({...STARTER_INVENTORY});
    this.blueprint.set({...INITIAL_BLUEPRINT});
    this.activeOrders.set(ORDER_POOL.slice(0, 3));
    this.pinnedOrderId.set(ORDER_POOL[0].id);
    this.craftedLamps.set(this.createStarterLamps());
    this.pedestals.set(
      INITIAL_PEDESTALS.map((p, idx) =>
        idx === 0 ? {...p, lampId: 'lamp_starter_1', isLit: true} : {...p}
      )
    );
    this.visitors.set(this.createInitialVisitors());
    this.offers.set([]);
    this.appraisalResult.set(null);
    this.lastGatherNote.set(null);
    this.workshopToast.set(null);
    this.activeTab.set('workbench');
    this.phase.set('playing');
    this.saveState();
  }

  setTab(tab: WorkshopTab): void {
    this.activeTab.set(tab);
    if (tab === 'showroom') {
      this.stepShowroomVisitors();
    }
  }

  toggleLampPower(): void {
    const next = !this.blueprint().isLit;
    this.blueprint.update((bp) => ({...bp, isLit: next}));
    this.sound.playSwitchClick(next);
  }

  onUpdateBlueprint(patch: Partial<LampBlueprint>): void {
    this.blueprint.update((bp) => ({...bp, ...patch}));
  }

  onPartSwapped(category: PartCategory): void {
    this.sound.playPartSwap(category);
  }

  craftForShowroom(): void {
    const bp = this.blueprint();
    if (!hasMaterialsForBlueprint(this.inventory(), bp)) return;

    this.inventory.update((inv) => consumeMaterialsForBlueprint(inv, bp));
    const cleanName = bp.name.trim() || `Atelier No. ${this.craftedLamps().length + 1}`;
    const finalBp: LampBlueprint = {...bp, name: cleanName};
    const metrics = computeLampMetrics(finalBp);

    const crafted: CraftedLamp = {
      id: `lamp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: Date.now(),
      blueprint: finalBp,
      metrics,
      likes: 0,
      admirationEarned: 0,
    };

    this.craftedLamps.update((list) => [crafted, ...list]);
    this.forageStamina.update((s) => Math.min(this.maxStamina, s + 1));
    this.reputation.update((r) => r + 5);
    this.sound.playGatherChime();

    // Increment default name counter for next build
    this.blueprint.update((cur) => ({
      ...cur,
      name: `Atelier No. ${this.craftedLamps().length + 1}`,
    }));

    this.showToast(`Crafted "${cleanName}" and added to Showroom Inventory.`);
    this.saveState();
    this.checkMasteryMilestone();
  }

  onPinOrder(order: CustomerOrder): void {
    this.pinnedOrderId.set(order.id);
    this.activeTab.set('workbench');
    this.sound.playPartSwap('base');
  }

  onDeliverOrder(order: CustomerOrder): void {
    const bp = this.blueprint();
    if (!hasMaterialsForBlueprint(this.inventory(), bp)) return;

    const metrics = computeLampMetrics(bp);
    const evaluation = evaluateOrderFulfillment(bp, metrics, order);

    this.inventory.update((inv) => consumeMaterialsForBlueprint(inv, bp));
    this.coins.update((c) => c + evaluation.coinsEarned);
    this.reputation.update((r) => r + evaluation.reputationEarned);
    this.ordersCompleted.update((n) => n + 1);
    this.forageStamina.update((s) => Math.min(this.maxStamina, s + 2));

    this.sound.playAppraisal(evaluation.stars);
    this.appraisalResult.set({order, evaluation});

    // Replace fulfilled order from pool
    const remaining = this.activeOrders().filter((o) => o.id !== order.id);
    const excludeIds = remaining.map((o) => o.id).concat(order.id);
    const [replacement] = pickReplacementOrders(
      this.reputation(),
      excludeIds,
      1
    );
    const nextOrders = replacement ? [...remaining, replacement] : remaining;
    this.activeOrders.set(nextOrders);
    this.pinnedOrderId.set(nextOrders[0]?.id ?? null);

    this.saveState();
  }

  closeAppraisalModal(): void {
    this.appraisalResult.set(null);
    this.checkMasteryMilestone();
  }

  onRefreshOrders(): void {
    const currentIds = this.activeOrders().map((o) => o.id);
    const fresh = pickReplacementOrders(this.reputation(), currentIds, 3);
    this.activeOrders.set(fresh);
    this.pinnedOrderId.set(fresh[0]?.id ?? null);
    this.sound.playPartSwap('stem');
    this.saveState();
  }

  onGatherZone(zoneId: GatherZoneId): void {
    if (this.forageStamina() <= 0) return;
    this.forageStamina.update((s) => Math.max(0, s - 1));
    this.gatherSeed += 3;
    const yields = gatherFromZone(zoneId, this.gatherSeed);

    this.inventory.update((inv) => {
      const next = {...inv};
      for (const y of yields) {
        next[y.materialId] = (next[y.materialId] ?? 0) + y.quantity;
      }
      return next;
    });

    const summary = yields
      .map((y) => `+${y.quantity} ${MATERIALS[y.materialId].name}`)
      .join(' and ');
    this.lastGatherNote.set(`Salvaged ${summary}.`);
    this.sound.playGatherChime();
    this.saveState();
  }

  onSalvageFree(): void {
    this.inventory.update((inv) => ({
      ...inv,
      oak: (inv.oak ?? 0) + 1,
      linen: (inv.linen ?? 0) + 1,
    }));
    this.lastGatherNote.set('Salvaged +1 Kiln-Dried Oak and +1 Belgian Linen from workshop scraps.');
    this.sound.playGatherChime();
    this.saveState();
  }

  onBuyMaterial(event: {materialId: MaterialId; quantity: number}): void {
    const mat = MATERIALS[event.materialId];
    const totalCost = mat.buyPrice * event.quantity;
    if (this.coins() < totalCost) return;

    this.coins.update((c) => c - totalCost);
    this.inventory.update((inv) => ({
      ...inv,
      [event.materialId]: (inv[event.materialId] ?? 0) + event.quantity,
    }));
    this.lastGatherNote.set(`Purchased ${event.quantity}x ${mat.name} for ${totalCost}c.`);
    this.sound.playCoinSale();
    this.saveState();
  }

  onPlaceLampInShowroom(event: {slotIndex: number; lampId: string}): void {
    this.pedestals.update((list) =>
      list.map((p) => {
        if (p.slotIndex === event.slotIndex) {
          return {...p, lampId: event.lampId, isLit: true};
        }
        // Ensure a lamp isn't duplicated across two pedestals
        if (p.lampId === event.lampId) {
          return {...p, lampId: null};
        }
        return p;
      })
    );
    this.sound.playPartSwap('base');
    this.stepShowroomVisitors();
    this.saveState();
  }

  onRemoveLampFromShowroom(slotIndex: number): void {
    const removedLampId = this.pedestals().find(
      (p) => p.slotIndex === slotIndex
    )?.lampId;
    this.pedestals.update((list) =>
      list.map((p) =>
        p.slotIndex === slotIndex ? {...p, lampId: null} : p
      )
    );
    if (removedLampId) {
      this.offers.update((list) =>
        list.filter((o) => o.lampId !== removedLampId)
      );
    }
    this.sound.playPartSwap('stem');
    this.saveState();
  }

  onTogglePedestalLight(slotIndex: number): void {
    let turnedOn = true;
    this.pedestals.update((list) =>
      list.map((p) => {
        if (p.slotIndex === slotIndex) {
          turnedOn = !p.isLit;
          return {...p, isLit: turnedOn};
        }
        return p;
      })
    );
    this.sound.playSwitchClick(turnedOn);
    this.saveState();
  }

  onToggleAllShowroomLights(): void {
    const anyLit = this.pedestals().some((p) => p.lampId && p.isLit);
    const next = !anyLit;
    this.pedestals.update((list) =>
      list.map((p) => (p.lampId ? {...p, isLit: next} : p))
    );
    this.sound.playSwitchClick(next);
    this.saveState();
  }

  onInviteVisitors(): void {
    this.offerSeed += 1;
    const occupiedSlots = this.pedestals()
      .filter((p) => p.lampId !== null)
      .map((p) => p.slotIndex);
    if (occupiedSlots.length === 0) return;

    // Move visitors to occupied pedestals and grant admiration reputation
    const poolCount = SHOWROOM_VISITORS_POOL.length;
    const nextVisitors: ShowroomVisitor[] = Array.from({length: 3}, (_, i) => {
      const profile = SHOWROOM_VISITORS_POOL[(this.offerSeed + i) % poolCount];
      const targetSlot = occupiedSlots[(this.offerSeed + i) % occupiedSlots.length];
      return {
        id: `vis_${Date.now()}_${i}`,
        name: profile.name,
        role: profile.role,
        targetSlot,
        xPct: ((targetSlot + 0.5) / 6) * 100,
        coatColor: profile.coatColor,
        thought: 'Inspecting glow',
      };
    });
    this.visitors.set(nextVisitors);

    const stats = computeShowroomAdmiration(this.pedestals(), this.craftedLamps());
    const repGain = Math.max(3, Math.round(stats.totalScore / 35));
    this.reputation.update((r) => r + repGain);

    // Generate a collector purchase offer if under 3 active offers
    const newOffer = generateShowroomOffer(
      this.pedestals(),
      this.craftedLamps(),
      this.reputation(),
      this.offerSeed
    );
    if (
      newOffer &&
      !this.offers().some((o) => o.lampId === newOffer.lampId) &&
      this.offers().length < 3
    ) {
      this.offers.update((list) => [newOffer, ...list]);
    }

    this.sound.playGatherChime();
    this.showToast(`Collectors admired your showroom (+${repGain} Reputation).`);
    this.saveState();
    this.checkMasteryMilestone();
  }

  onAcceptShowroomOffer(offer: ShowroomOffer): void {
    this.coins.update((c) => c + offer.offeredCoins);
    this.reputation.update((r) => r + 15);
    this.salesCount.update((s) => s + 1);

    this.craftedLamps.update((list) =>
      list.map((l) =>
        l.id === offer.lampId
          ? {...l, soldTo: offer.visitorName, soldPrice: offer.offeredCoins}
          : l
      )
    );
    this.pedestals.update((list) =>
      list.map((p) => (p.lampId === offer.lampId ? {...p, lampId: null} : p))
    );
    this.offers.update((list) => list.filter((o) => o.lampId !== offer.lampId));

    this.sound.playCoinSale();
    this.showToast(`Sold "${offer.lampName}" to ${offer.visitorName} for ${offer.offeredCoins}c!`);
    this.saveState();
    this.checkMasteryMilestone();
  }

  onDeclineShowroomOffer(offerId: string): void {
    this.offers.update((list) => list.filter((o) => o.id !== offerId));
    this.sound.playPartSwap('shade');
  }

  continueEndless(): void {
    this.phase.set('playing');
  }

  materialName(id: MaterialId): string {
    return MATERIALS[id]?.name ?? id;
  }

  functionalityName(id: string): string {
    return FUNCTIONALITIES.find((f) => f.id === id)?.name ?? id;
  }

  private stepShowroomVisitors(): void {
    const occupied = this.pedestals()
      .filter((p) => p.lampId !== null)
      .map((p) => p.slotIndex);
    if (occupied.length === 0) return;

    this.visitors.update((list) =>
      list.map((v, idx) => {
        const nextSlot = occupied[(idx + Math.floor(Math.random() * occupied.length)) % occupied.length];
        return {
          ...v,
          targetSlot: nextSlot,
          xPct: ((nextSlot + 0.5) / 6) * 100,
        };
      })
    );
  }

  private checkMasteryMilestone(): void {
    if (!this.masteryAchieved() && this.reputation() >= MASTERY_REP_THRESHOLD) {
      this.masteryAchieved.set(true);
      this.phase.set('gameover');
      this.saveState();
    }
  }

  private showToast(msg: string): void {
    this.workshopToast.set(msg);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (this.workshopToast() === msg) {
          this.workshopToast.set(null);
        }
      }, 4500);
    }
  }

  private saveState(): void {
    if (typeof window === 'undefined') return;
    try {
      const payload: SavedState = {
        coins: this.coins(),
        reputation: this.reputation(),
        forageStamina: this.forageStamina(),
        ordersCompleted: this.ordersCompleted(),
        salesCount: this.salesCount(),
        masteryAchieved: this.masteryAchieved(),
        inventory: this.inventory(),
        activeOrders: this.activeOrders(),
        craftedLamps: this.craftedLamps(),
        pedestals: this.pedestals(),
        blueprint: this.blueprint(),
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      this.hasSavedProgress.set(true);
    } catch {
      // Ignore storage quota errors
    }
  }

  private loadSavedState(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SavedState>;
      if (typeof parsed.coins === 'number') this.coins.set(parsed.coins);
      if (typeof parsed.reputation === 'number') this.reputation.set(parsed.reputation);
      if (typeof parsed.forageStamina === 'number') {
        this.forageStamina.set(parsed.forageStamina);
      }
      if (typeof parsed.ordersCompleted === 'number') {
        this.ordersCompleted.set(parsed.ordersCompleted);
      }
      if (typeof parsed.salesCount === 'number') this.salesCount.set(parsed.salesCount);
      if (typeof parsed.masteryAchieved === 'boolean') {
        this.masteryAchieved.set(parsed.masteryAchieved);
      }
      if (parsed.inventory) this.inventory.set(parsed.inventory);
      if (Array.isArray(parsed.activeOrders) && parsed.activeOrders.length > 0) {
        this.activeOrders.set(parsed.activeOrders);
        this.pinnedOrderId.set(parsed.activeOrders[0].id);
      }
      if (Array.isArray(parsed.craftedLamps) && parsed.craftedLamps.length > 0) {
        this.craftedLamps.set(parsed.craftedLamps);
      }
      if (Array.isArray(parsed.pedestals) && parsed.pedestals.length === 6) {
        this.pedestals.set(parsed.pedestals);
      }
      if (parsed.blueprint) this.blueprint.set(parsed.blueprint);
      this.hasSavedProgress.set(true);
    } catch {
      // Ignore malformed save
    }
  }
}
