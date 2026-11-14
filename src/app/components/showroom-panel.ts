import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {computeShowroomAdmiration} from '../game/lamp.engine';
import {
  CraftedLamp,
  ShowroomOffer,
  ShowroomPedestal,
  ShowroomVisitor,
} from '../game/lamp.types';
import {LampSvg} from './lamp-svg';

@Component({
  selector: 'app-showroom-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LampSvg, MatIconModule],
  template: `
    <div class="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <!-- Top Showroom Header -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="max-w-xl">
          <h2 class="font-display text-2xl sm:text-3xl font-semibold text-stone-100">
            Atelier Showroom Gallery
          </h2>
          <p class="text-sm text-stone-400 mt-1">
            Arrange crafted lamps on pedestals. Lit displays draw collectors who admire pieces and make purchase offers.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            (click)="toggleAllLights.emit()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1d2026] border border-white/15 text-xs font-medium text-stone-200 hover:bg-[#272b34] transition-colors cursor-pointer whitespace-nowrap"
          >
            <mat-icon class="!text-[16px] !w-4 !h-4">tungsten</mat-icon>
            <span>{{ showroomStats().litCount > 0 ? 'Dim Gallery' : 'Illuminate All' }}</span>
          </button>

          <button
            type="button"
            (click)="inviteVisitors.emit()"
            [disabled]="showroomStats().placedCount === 0"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            <mat-icon class="!text-[16px] !w-4 !h-4">groups</mat-icon>
            <span>Invite Collectors</span>
          </button>
        </div>
      </div>

      <!-- Main Showroom Layout: Gallery Hall + Collector Offers Sidebar -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Left 8 Cols: Architectural Gallery Canvas + 6 Pedestals -->
        <div class="lg:col-span-8 space-y-4">
          <!-- Atmospheric Live Visitor Canvas -->
          <div class="relative h-56 sm:h-64 rounded-xl overflow-hidden border border-white/10 bg-[#121318]">
            <canvas
              #showroomCanvas
              class="absolute inset-0 w-full h-full block pointer-events-none"
            ></canvas>

            <!-- Top Stats Overlay (unboxed text) -->
            <div class="absolute top-3 left-4 right-4 flex items-center justify-between text-xs pointer-events-none">
              <span class="text-stone-300">
                Displays <strong class="font-mono-num text-stone-100">{{ showroomStats().placedCount }}/6</strong>
                · Lit <strong class="font-mono-num text-amber-300">{{ showroomStats().litCount }}</strong>
              </span>
              <span class="font-mono-num text-stone-300">
                Gallery Admiration
                <strong class="text-emerald-400">{{ showroomStats().totalScore }}</strong>
              </span>
            </div>

            <!-- Interactive Lamps standing along the gallery floor -->
            <div class="absolute inset-x-4 bottom-11 grid grid-cols-6 gap-2 items-end pointer-events-none">
              @for (slot of pedestalViews(); track slot.pedestal.slotIndex) {
                <div class="flex flex-col items-center">
                  @if (slot.lamp; as lamp) {
                    <div class="w-20 sm:w-24 h-28 sm:h-32 pointer-events-auto">
                      <app-lamp-svg
                        [blueprint]="lamp.blueprint"
                        [metrics]="lamp.metrics"
                        [forceLit]="slot.pedestal.isLit"
                        [uid]="'showroom_' + slot.pedestal.slotIndex"
                        (toggleSwitch)="togglePedestalLight.emit(slot.pedestal.slotIndex)"
                      />
                    </div>
                  } @else {
                    <div class="h-16 flex items-end justify-center text-[11px] text-stone-500 pb-2">
                      Empty
                    </div>
                  }
                  <div class="w-full max-w-[78px] h-3 rounded-t-sm bg-[#2c251f] border-t border-white/15"></div>
                </div>
              }
            </div>
          </div>

          <!-- 6 Pedestal Management Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (slot of pedestalViews(); track slot.pedestal.slotIndex) {
              <div
                class="p-3.5 rounded-xl bg-[#17191e] border flex flex-col justify-between space-y-3"
                [class]="
                  selectedSlot() === slot.pedestal.slotIndex
                    ? 'border-amber-400'
                    : 'border-white/10'
                "
              >
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="text-sm font-semibold text-stone-100 truncate">
                      {{ slot.pedestal.label }}
                    </h3>
                    <span class="font-mono-num text-[11px] text-amber-300 shrink-0">
                      {{ slot.pedestal.prestigeMultiplier }}x
                    </span>
                  </div>
                  <p class="text-xs text-stone-400 mt-0.5">{{ slot.pedestal.zoneHint }}</p>
                </div>

                @if (slot.lamp; as lamp) {
                  <div class="p-2.5 rounded-lg bg-[#121418] border border-white/5 space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-medium text-stone-100 truncate">
                        {{ lamp.blueprint.name }}
                      </span>
                      <span class="font-mono-num text-xs text-emerald-400 shrink-0">
                        {{ lamp.metrics.estimatedValue }}c
                      </span>
                    </div>
                    <p class="text-[11px] text-stone-400 truncate">
                      {{ lamp.metrics.dominantStyle }} · {{ lamp.metrics.effectiveKelvin }}K
                    </p>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      (click)="togglePedestalLight.emit(slot.pedestal.slotIndex)"
                      class="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap"
                      [class]="
                        slot.pedestal.isLit
                          ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
                          : 'bg-[#20232b] text-stone-300 border-white/10'
                      "
                    >
                      {{ slot.pedestal.isLit ? 'Lit' : 'Off' }}
                    </button>
                    <button
                      type="button"
                      (click)="openSlotPicker(slot.pedestal.slotIndex)"
                      class="px-2.5 py-1.5 rounded-lg bg-[#20232b] border border-white/10 text-xs text-stone-200 hover:bg-[#2a2e38] cursor-pointer"
                    >
                      Swap
                    </button>
                    <button
                      type="button"
                      (click)="removeLamp.emit(slot.pedestal.slotIndex)"
                      [attr.aria-label]="'Remove lamp from ' + slot.pedestal.label"
                      class="p-1.5 rounded-lg bg-[#20232b] border border-white/10 text-stone-400 hover:text-rose-300 cursor-pointer"
                    >
                      <mat-icon class="!text-[16px] !w-4 !h-4">close</mat-icon>
                    </button>
                  </div>
                } @else {
                  <button
                    type="button"
                    (click)="openSlotPicker(slot.pedestal.slotIndex)"
                    class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#20232b] border border-white/12 text-xs font-medium text-stone-200 hover:bg-[#2a2e38] transition-colors cursor-pointer"
                  >
                    <mat-icon class="!text-[16px] !w-4 !h-4">add</mat-icon>
                    <span>Place Crafted Lamp</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Inline Inventory Placement Picker when a pedestal is selected -->
          @if (selectedSlot() !== null) {
            <div class="p-4 rounded-xl bg-[#17191e] border border-amber-400/50 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-stone-100">
                  Select a Crafted Lamp for {{ pedestals()[selectedSlot()!]?.label }}
                </h3>
                <button
                  type="button"
                  (click)="selectedSlot.set(null)"
                  class="text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  Close
                </button>
              </div>

              @if (availableInventory().length === 0) {
                <div class="flex flex-wrap items-center justify-between gap-3 py-2 text-xs text-stone-400">
                  <span>No unplaced lamps in storage. Craft a new lamp on the Workbench first.</span>
                  <button
                    type="button"
                    (click)="goToWorkbench.emit()"
                    class="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-semibold cursor-pointer"
                  >
                    Open Workbench
                  </button>
                </div>
              } @else {
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  @for (lamp of availableInventory(); track lamp.id) {
                    <button
                      type="button"
                      (click)="onPlaceLamp(lamp.id)"
                      class="text-left p-3 rounded-lg bg-[#121418] border border-white/10 hover:border-amber-400 transition-colors cursor-pointer"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-sm font-medium text-stone-100 truncate">
                          {{ lamp.blueprint.name }}
                        </span>
                        <span class="font-mono-num text-xs text-amber-300 shrink-0">
                          {{ lamp.metrics.estimatedValue }}c
                        </span>
                      </div>
                      <p class="mt-1 text-xs text-stone-400">
                        {{ lamp.metrics.dominantStyle }} · Score {{ lamp.metrics.craftScore }}
                      </p>
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Right 4 Cols: Collector Offers & Showroom Activity -->
        <aside class="lg:col-span-4 space-y-4">
          <div class="p-4 rounded-xl bg-[#17191e] border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-display text-lg font-semibold text-stone-100">
                Collector Offers
              </h3>
              <span class="font-mono-num text-xs text-stone-400">
                {{ offers().length }} active
              </span>
            </div>

            @if (offers().length === 0) {
              <p class="text-xs text-stone-400 leading-relaxed py-2">
                @if (showroomStats().placedCount === 0) {
                  Place crafted lamps on the pedestals to attract collectors and earn admiration.
                } @else {
                  Visitors are browsing your pedestals. Click "Invite Collectors" to welcome eager buyers.
                }
              </p>
            } @else {
              <div class="space-y-3">
                @for (offer of offers(); track offer.id) {
                  <div class="p-3.5 rounded-lg bg-[#121418] border border-white/10 space-y-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <h4 class="text-sm font-semibold text-stone-100">
                          {{ offer.visitorName }}
                        </h4>
                        <p class="text-xs text-stone-400">{{ offer.visitorRole }}</p>
                      </div>
                      <span class="font-mono-num text-sm font-semibold text-amber-300">
                        {{ offer.offeredCoins }}c
                      </span>
                    </div>

                    <p class="text-xs text-stone-300 leading-relaxed">
                      "{{ offer.comment }}"
                    </p>

                    <div class="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        (click)="acceptOffer.emit(offer)"
                        class="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-stone-950 text-xs font-semibold hover:bg-emerald-400 transition-colors cursor-pointer"
                      >
                        Accept Sale
                      </button>
                      <button
                        type="button"
                        (click)="declineOffer.emit(offer.id)"
                        class="px-3 py-1.5 rounded-lg bg-[#20232b] border border-white/10 text-xs text-stone-300 hover:bg-[#2a2e38] transition-colors cursor-pointer"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Sold Archive Summary -->
          <div class="p-4 rounded-xl bg-[#17191e] border border-white/10 space-y-2.5">
            <h3 class="text-sm font-semibold text-stone-200">
              Recent Showroom Sales
            </h3>
            @if (soldLamps().length === 0) {
              <p class="text-xs text-stone-400">No showroom pieces sold yet.</p>
            } @else {
              <div class="space-y-2 max-h-44 overflow-y-auto atelier-scroll">
                @for (sold of soldLamps(); track sold.id) {
                  <div class="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                    <div class="min-w-0">
                      <div class="text-stone-200 font-medium truncate">{{ sold.blueprint.name }}</div>
                      <div class="text-stone-400 truncate">Sold to {{ sold.soldTo }}</div>
                    </div>
                    <span class="font-mono-num text-amber-300 shrink-0">
                      +{{ sold.soldPrice }}c
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class ShowroomPanel {
  readonly pedestals = input.required<ShowroomPedestal[]>();
  readonly craftedLamps = input.required<CraftedLamp[]>();
  readonly visitors = input.required<ShowroomVisitor[]>();
  readonly offers = input.required<ShowroomOffer[]>();

  readonly placeLamp = output<{slotIndex: number; lampId: string}>();
  readonly removeLamp = output<number>();
  readonly togglePedestalLight = output<number>();
  readonly toggleAllLights = output<void>();
  readonly inviteVisitors = output<void>();
  readonly acceptOffer = output<ShowroomOffer>();
  readonly declineOffer = output<string>();
  readonly goToWorkbench = output<void>();

  readonly selectedSlot = signal<number | null>(null);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('showroomCanvas');
  private readonly destroyRef = inject(DestroyRef);

  readonly showroomStats = computed(() =>
    computeShowroomAdmiration(this.pedestals(), this.craftedLamps())
  );

  readonly pedestalViews = computed(() =>
    this.pedestals().map((pedestal) => ({
      pedestal,
      lamp: pedestal.lampId
        ? (this.craftedLamps().find((l) => l.id === pedestal.lampId) ?? null)
        : null,
    }))
  );

  readonly availableInventory = computed(() => {
    const placedIds = new Set(
      this.pedestals()
        .map((p) => p.lampId)
        .filter((id): id is string => Boolean(id))
    );
    return this.craftedLamps().filter((l) => !l.soldTo && !placedIds.has(l.id));
  });

  readonly soldLamps = computed(() =>
    this.craftedLamps().filter((l) => Boolean(l.soldTo))
  );

  constructor() {
    let rafId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let width = 800;
    let height = 240;

    afterNextRender(() => {
      const canvasEl = this.canvasRef()?.nativeElement;
      if (!canvasEl) return;
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      const updateSize = () => {
        const rect = canvasEl.getBoundingClientRect();
        width = Math.max(300, Math.round(rect.width));
        height = Math.max(180, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasEl.width = width * dpr;
        canvasEl.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      updateSize();
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(canvasEl);

      const draw = (now: number) => {
        this.renderGallery(ctx, width, height, now / 1000);
        rafId = requestAnimationFrame(draw);
      };
      rafId = requestAnimationFrame(draw);

      this.destroyRef.onDestroy(() => {
        cancelAnimationFrame(rafId);
        resizeObserver?.disconnect();
      });
    });
  }

  openSlotPicker(slotIndex: number): void {
    this.selectedSlot.update((cur) => (cur === slotIndex ? null : slotIndex));
  }

  onPlaceLamp(lampId: string): void {
    const slot = this.selectedSlot();
    if (slot === null) return;
    this.placeLamp.emit({slotIndex: slot, lampId});
    this.selectedSlot.set(null);
  }

  private renderGallery(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number
  ): void {
    // Wall & floor
    const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.78);
    wallGrad.addColorStop(0, '#13151b');
    wallGrad.addColorStop(1, '#1b1e26');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, h * 0.78);

    // Subtle arched gallery niches
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    const colW = w / 6;
    for (let i = 0; i < 6; i++) {
      const cx = colW * (i + 0.5);
      ctx.beginPath();
      ctx.arc(cx, h * 0.36, Math.min(colW * 0.36, 44), Math.PI, 0);
      ctx.lineTo(cx + Math.min(colW * 0.36, 44), h * 0.78);
      ctx.moveTo(cx - Math.min(colW * 0.36, 44), h * 0.36);
      ctx.lineTo(cx - Math.min(colW * 0.36, 44), h * 0.78);
      ctx.stroke();
    }

    // Light pools from lit pedestals
    const views = this.pedestalViews();
    for (let i = 0; i < views.length; i++) {
      const v = views[i];
      if (!v.lamp || !v.pedestal.isLit) continue;
      const cx = colW * (i + 0.5);
      const {r, g, b} = v.lamp.metrics.lightColorRgb;
      const grad = ctx.createRadialGradient(cx, h * 0.52, 8, cx, h * 0.56, 115);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.28)`);
      grad.addColorStop(0.55, `rgba(${r},${g},${b},0.1)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Oak gallery floor
    const floorGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
    floorGrad.addColorStop(0, '#2a2119');
    floorGrad.addColorStop(1, '#151210');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);

    // Animated NPC Visitors strolling along the foreground showroom walkway
    const visitors = this.visitors();
    const slotCounts = new Map<number, number>();
    visitors.forEach((vis, idx) => {
      const seenAtSlot = slotCounts.get(vis.targetSlot) ?? 0;
      slotCounts.set(vis.targetSlot, seenAtSlot + 1);

      const targetX = ((vis.targetSlot + 0.5) / 6) * w;
      const laneOffset = seenAtSlot === 0 ? -24 : seenAtSlot === 1 ? 26 : 0;
      const sway = Math.sin(t * 0.8 + idx * 2.1) * 10;
      const vx = Math.max(28, Math.min(w - 28, targetX + laneOffset + sway));
      const vy = h * 0.88;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(vx, vy + 14, 11, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Coat silhouette
      ctx.fillStyle = vis.coatColor;
      ctx.beginPath();
      ctx.roundRect(vx - 7, vy - 14, 14, 26, 5);
      ctx.fill();

      // Head
      ctx.fillStyle = '#E7C8B0';
      ctx.beginPath();
      ctx.arc(vx, vy - 20, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Nameplate beside/above visitor
      ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(245, 245, 244, 0.88)';
      ctx.fillText(vis.name.split(' ')[0], vx, vy - 30);
    });
  }
}
