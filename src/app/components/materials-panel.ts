import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {GATHER_ZONES, MATERIALS, MATERIAL_LIST} from '../game/lamp.catalog';
import {
  GatherZoneId,
  MaterialId,
  MaterialInventory,
} from '../game/lamp.types';

@Component({
  selector: 'app-materials-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
      <!-- Gathering Expeditions Section -->
      <section class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-2xl sm:text-3xl font-semibold text-stone-100">
              Material Gathering & Supply
            </h2>
            <p class="text-sm text-stone-400 mt-1">
              Forage raw oak, brass, and glass from local workshops or purchase exact stock with coins.
            </p>
          </div>

          <div class="flex items-center gap-4 text-sm">
            <div class="font-mono-num text-stone-200">
              <span class="text-stone-400">Forage Stamina </span>
              <strong class="text-amber-300">{{ forageStamina() }} / {{ maxStamina() }}</strong>
            </div>
            @if (forageStamina() === 0) {
              <button
                type="button"
                (click)="salvageFree.emit()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d2026] border border-white/15 text-xs font-medium text-amber-300 hover:bg-[#262a32] cursor-pointer whitespace-nowrap"
              >
                <mat-icon class="!text-[16px] !w-4 !h-4">recycling</mat-icon>
                <span>Scrap Salvage (+1 Oak & Linen)</span>
              </button>
            }
          </div>
        </div>

        @if (lastGatherNote()) {
          <div
            class="px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-sm text-emerald-200 flex items-center gap-2"
            role="status"
          >
            <mat-icon class="!text-[18px] !w-[18px] !h-[18px] text-emerald-400">inventory_2</mat-icon>
            <span>{{ lastGatherNote() }}</span>
          </div>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          @for (zone of zones; track zone.id) {
            <div class="flex flex-col justify-between p-4 rounded-xl bg-[#17191e] border border-white/10 space-y-3">
              <div>
                <h3 class="font-display text-base font-semibold text-stone-100">
                  {{ zone.name }}
                </h3>
                <p class="text-xs text-stone-400 mt-1">{{ zone.subtitle }}</p>
                <div class="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-stone-300">
                  @for (matId of zone.yields; track matId; let last = $last) {
                    <span>{{ materialName(matId) }}{{ last ? '' : ' ·' }}</span>
                  }
                </div>
              </div>

              <button
                type="button"
                [disabled]="forageStamina() < zone.energyCost"
                (click)="gatherZone.emit(zone.id)"
                class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <mat-icon class="!text-[16px] !w-4 !h-4">explore</mat-icon>
                <span>Gather (+2 Materials)</span>
              </button>
            </div>
          }
        </div>
      </section>

      <!-- Material Supply Market Section -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-display text-xl font-semibold text-stone-100">
            Artisanal Material Catalog
          </h3>
          <span class="font-mono-num text-sm text-amber-300">
            Available Coins: {{ coins() }}c
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          @for (mat of materials; track mat.id) {
            <div class="flex flex-col justify-between p-4 rounded-xl bg-[#17191e] border border-white/10 space-y-3">
              <div class="space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span
                      class="w-5 h-5 rounded-md shrink-0 border border-white/20"
                      [style.background-color]="mat.colorHex"
                    ></span>
                    <div class="min-w-0">
                      <h4 class="text-sm font-semibold text-stone-100 truncate">
                        {{ mat.name }}
                      </h4>
                      <p class="text-xs text-stone-400">
                        {{ categoryLabel(mat.category) }} · {{ mat.styles.slice(0, 2).join(', ') }}
                      </p>
                    </div>
                  </div>
                  <span
                    class="font-mono-num text-xs font-semibold shrink-0"
                    [class]="(inventory()[mat.id] || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'"
                  >
                    {{ inventory()[mat.id] || 0 }} in stock
                  </span>
                </div>

                <p class="text-xs text-stone-300 leading-relaxed">
                  {{ mat.description }}
                </p>

                <div class="flex items-center gap-3 text-xs font-mono-num text-stone-400 pt-1">
                  <span>Shift {{ mat.warmthShift > 0 ? '+' : '' }}{{ mat.warmthShift }}K</span>
                  <span>·</span>
                  <span>Diff {{ Math.round(mat.diffusion * 100) }}%</span>
                  <span>·</span>
                  <span>Value +{{ mat.craftValue }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  [disabled]="coins() < mat.buyPrice"
                  (click)="buyMaterial.emit({materialId: mat.id, quantity: 1})"
                  class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#22252d] border border-white/12 text-xs font-medium text-stone-100 hover:bg-[#2c303a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <span>Buy 1</span>
                  <span class="font-mono-num text-amber-300">({{ mat.buyPrice }}c)</span>
                </button>
                <button
                  type="button"
                  [disabled]="coins() < mat.buyPrice * 3"
                  (click)="buyMaterial.emit({materialId: mat.id, quantity: 3})"
                  class="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#1c1f26] border border-white/10 text-xs font-medium text-stone-300 hover:bg-[#272b34] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <span>Buy 3</span>
                  <span class="font-mono-num text-amber-300">({{ mat.buyPrice * 3 }}c)</span>
                </button>
              </div>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class MaterialsPanel {
  readonly inventory = input.required<MaterialInventory>();
  readonly coins = input.required<number>();
  readonly forageStamina = input.required<number>();
  readonly maxStamina = input.required<number>();
  readonly lastGatherNote = input<string | null>(null);

  readonly gatherZone = output<GatherZoneId>();
  readonly salvageFree = output<void>();
  readonly buyMaterial = output<{materialId: MaterialId; quantity: number}>();

  readonly zones = GATHER_ZONES;
  readonly materials = MATERIAL_LIST;
  readonly Math = Math;

  materialName(id: MaterialId): string {
    return MATERIALS[id].name;
  }

  categoryLabel(cat: 'structural' | 'diffuser' | 'both'): string {
    if (cat === 'structural') return 'Base & Frame';
    if (cat === 'diffuser') return 'Shade & Diffuser';
    return 'Frame & Shade';
  }
}
