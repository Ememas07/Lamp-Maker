import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {
  BASE_SHAPES,
  BULBS,
  FUNCTIONALITIES,
  MATERIALS,
  MATERIAL_LIST,
  SHADE_SHAPES,
  SHADE_TINTS,
  STEMS,
} from '../game/lamp.catalog';
import {
  getRequiredMaterialsForBlueprint,
  hasMaterialsForBlueprint,
} from '../game/lamp.engine';
import {
  BaseShapeId,
  BulbId,
  CustomerOrder,
  FunctionalityId,
  LampBlueprint,
  LampMetrics,
  MaterialId,
  MaterialInventory,
  PartCategory,
  ShadeShapeId,
  StemId,
} from '../game/lamp.types';

@Component({
  selector: 'app-workbench-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <aside
      class="flex flex-col h-full bg-[#17191e] border border-white/10 rounded-xl overflow-hidden"
      aria-label="Lamp Workbench Controls"
    >
      <!-- Lamp Name + Category Tabs -->
      <div class="p-3.5 border-b border-white/10 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <label for="lamp-name-input" class="text-xs font-medium text-stone-400 shrink-0">
            Design Name
          </label>
          <input
            id="lamp-name-input"
            type="text"
            maxlength="34"
            [value]="blueprint().name"
            (input)="onNameInput($event)"
            class="w-full max-w-[230px] px-2.5 py-1.5 rounded-lg bg-[#111215] border border-white/10 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div
          class="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#111215] border border-white/5"
          role="tablist"
          aria-label="Lamp part categories"
        >
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
              class="px-2 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              [class]="
                activeTab() === tab.id
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              "
            >
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <!-- Scrollable Part & Material Options -->
      <div class="flex-1 overflow-y-auto atelier-scroll p-3.5 space-y-4">
        @switch (activeTab()) {
          @case ('base') {
            <section class="space-y-2.5">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Base Silhouette
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (shape of baseShapes; track shape.id) {
                  <button
                    type="button"
                    (click)="selectBaseShape(shape.id)"
                    class="text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    [class]="
                      blueprint().baseShapeId === shape.id
                        ? 'bg-amber-500/12 border-amber-400 text-stone-100'
                        : 'bg-[#121418] border-white/8 text-stone-300 hover:border-white/20'
                    "
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm font-medium">{{ shape.name }}</span>
                      <span class="font-mono-num text-xs text-stone-400">{{ shape.craftCost }}c</span>
                    </div>
                    <p class="mt-1 text-xs text-stone-400 line-clamp-1">
                      {{ shape.styles.join(' · ') }}
                    </p>
                  </button>
                }
              </div>
            </section>

            <section class="space-y-2.5">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Base Material
                </h3>
                <button
                  type="button"
                  (click)="goToMaterials.emit()"
                  class="text-xs text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Gather / Buy
                </button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (mat of structuralMaterials; track mat.id) {
                  <button
                    type="button"
                    (click)="selectBaseMaterial(mat.id)"
                    class="text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    [class]="
                      blueprint().baseMaterialId === mat.id
                        ? 'bg-amber-500/12 border-amber-400 text-stone-100'
                        : 'bg-[#121418] border-white/8 text-stone-300 hover:border-white/20'
                    "
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="inline-flex items-center gap-2 text-sm font-medium min-w-0">
                        <span
                          class="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/20"
                          [style.background-color]="mat.colorHex"
                        ></span>
                        <span class="truncate">{{ mat.name }}</span>
                      </span>
                      <span
                        class="font-mono-num text-xs shrink-0"
                        [class]="(inventory()[mat.id] || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'"
                      >
                        {{ inventory()[mat.id] || 0 }} left
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-stone-400 truncate">
                      {{ mat.styles.slice(0, 2).join(' · ') }}
                    </p>
                  </button>
                }
              </div>
            </section>
          }

          @case ('stem') {
            <section class="space-y-2.5">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Stem Architecture
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (stem of stems; track stem.id) {
                  <button
                    type="button"
                    (click)="selectStem(stem.id)"
                    class="text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    [class]="
                      blueprint().stemId === stem.id
                        ? 'bg-amber-500/12 border-amber-400 text-stone-100'
                        : 'bg-[#121418] border-white/8 text-stone-300 hover:border-white/20'
                    "
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm font-medium">{{ stem.name }}</span>
                      <span class="font-mono-num text-xs text-stone-400">{{ stem.craftCost }}c</span>
                    </div>
                    <p class="mt-1 text-xs text-stone-400 line-clamp-1">
                      {{ stem.styles.join(' · ') }}
                    </p>
                  </button>
                }
              </div>
            </section>

            <section class="space-y-2.5">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Switch & Functionality
              </h3>
              <div class="grid grid-cols-1 gap-2">
                @for (fn of functionalities; track fn.id) {
                  <button
                    type="button"
                    (click)="selectFunctionality(fn.id)"
                    class="text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    [class]="
                      blueprint().functionalityId === fn.id
                        ? 'bg-amber-500/12 border-amber-400 text-stone-100'
                        : 'bg-[#121418] border-white/8 text-stone-300 hover:border-white/20'
                    "
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm font-medium">{{ fn.name }}</span>
                      <span class="font-mono-num text-xs text-stone-400">{{ fn.craftCost }}c</span>
                    </div>
                    <p class="mt-1 text-xs text-stone-400">{{ fn.description }}</p>
                  </button>
                }
              </div>
            </section>

            <!-- Height & Tilt Fine Controls -->
            <section class="space-y-3 pt-1">
              <div>
                <div class="flex items-center justify-between text-xs mb-1.5">
                  <label for="stem-height-range" class="text-stone-300">Stem Elevation</label>
                  <span class="font-mono-num text-stone-400">{{ blueprint().stemHeightPct }}%</span>
                </div>
                <input
                  id="stem-height-range"
                  type="range"
                  min="0"
                  max="100"
                  [value]="blueprint().stemHeightPct"
                  (input)="onHeightChange($event)"
                  class="w-full atelier-range"
                />
              </div>

              @if (activeFunctionality().allowsTilt) {
                <div>
                  <div class="flex items-center justify-between text-xs mb-1.5">
                    <label for="shade-tilt-range" class="text-stone-300">Pivot Beam Angle</label>
                    <span class="font-mono-num text-amber-300">{{ blueprint().shadeTiltDeg }}°</span>
                  </div>
                  <input
                    id="shade-tilt-range"
                    type="range"
                    min="-35"
                    max="35"
                    [value]="blueprint().shadeTiltDeg"
                    (input)="onTiltChange($event)"
                    class="w-full atelier-range"
                  />
                </div>
              }
            </section>
          }

          @case ('bulb') {
            <section class="space-y-2.5">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Bulb & Color Temperature
              </h3>
              <div class="grid grid-cols-1 gap-2">
                @for (bulb of bulbs; track bulb.id) {
                  <button
                    type="button"
                    (click)="selectBulb(bulb.id)"
                    class="text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    [class]="
                      blueprint().bulbId === bulb.id
                        ? 'bg-amber-500/12 border-amber-400 text-stone-100'
                        : 'bg-[#121418] border-white/8 text-stone-300 hover:border-white/20'
                    "
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="inline-flex items-center gap-2 text-sm font-medium">
                        <span
                          class="w-3 h-3 rounded-full shrink-0"
                          [style.background-color]="bulb.filamentColor"
                        ></span>
                        {{ bulb.name }}
                      </span>
                      <span class="font-mono-num text-xs text-stone-400">
                        {{ bulb.baseLumens }} lm · {{ bulb.craftCost }}c
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-stone-400">{{ bulb.description }}</p>
                  </button>
                }
              </div>
            </section>

            <section class="pt-1 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <label for="dimmer-range" class="text-stone-300">
                  Dimmer Output
                  @if (!activeFunctionality().allowsDimmer) {
                    <span class="text-stone-500">(requires Dimmer / Pivot / Uplight)</span>
                  }
                </label>
                <span class="font-mono-num text-amber-300">
                  {{ activeFunctionality().allowsDimmer ? blueprint().dimmerLevel + '%' : 'Fixed 100%' }}
                </span>
              </div>
              <input
                id="dimmer-range"
                type="range"
                min="15"
                max="100"
                [disabled]="!activeFunctionality().allowsDimmer"
                [value]="activeFunctionality().allowsDimmer ? blueprint().dimmerLevel : 100"
                (input)="onDimmerChange($event)"
                class="w-full atelier-range disabled:opacity-40"
              />
            </section>
          }

          @case ('shade') {
            <section class="space-y-2.5">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Shade Geometry
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (shade of shadeShapes; track shade.id) {
                  <button
                    type="button"
                    (click)="selectShadeShape(shade.id)"
                    class="text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    [class]="
                      blueprint().shadeShapeId === shade.id
                        ? 'bg-amber-500/12 border-amber-400 text-stone-100'
                        : 'bg-[#121418] border-white/8 text-stone-300 hover:border-white/20'
                    "
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm font-medium">{{ shade.name }}</span>
                      <span class="font-mono-num text-xs text-stone-400">{{ shade.beamAngleDeg }}°</span>
                    </div>
                    <p class="mt-1 text-xs text-stone-400 line-clamp-1">
                      {{ shade.styles.join(' · ') }}
                    </p>
                  </button>
                }
              </div>
            </section>

            <section class="space-y-2.5">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Diffuser Material
                </h3>
                <button
                  type="button"
                  (click)="goToMaterials.emit()"
                  class="text-xs text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Gather / Buy
                </button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (mat of diffuserMaterials; track mat.id) {
                  <button
                    type="button"
                    (click)="selectShadeMaterial(mat.id)"
                    class="text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    [class]="
                      blueprint().shadeMaterialId === mat.id
                        ? 'bg-amber-500/12 border-amber-400 text-stone-100'
                        : 'bg-[#121418] border-white/8 text-stone-300 hover:border-white/20'
                    "
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="inline-flex items-center gap-2 text-sm font-medium min-w-0">
                        <span
                          class="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/20"
                          [style.background-color]="mat.colorHex"
                        ></span>
                        <span class="truncate">{{ mat.name }}</span>
                      </span>
                      <span
                        class="font-mono-num text-xs shrink-0"
                        [class]="(inventory()[mat.id] || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'"
                      >
                        {{ inventory()[mat.id] || 0 }} left
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-stone-400 truncate">
                      {{ mat.styles.slice(0, 2).join(' · ') }}
                    </p>
                  </button>
                }
              </div>
            </section>

            <section class="space-y-2">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Shade Finish Tint
              </h3>
              <div class="flex flex-wrap items-center gap-2">
                @for (tint of shadeTints; track tint.hex) {
                  <button
                    type="button"
                    (click)="selectTint(tint.hex)"
                    [attr.aria-label]="'Tint ' + tint.name"
                    [title]="tint.name"
                    class="w-8 h-8 rounded-lg border-2 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    [style.background-color]="tint.hex"
                    [class]="
                      blueprint().shadeTintHex === tint.hex
                        ? 'border-amber-400 scale-105'
                        : 'border-white/15 hover:border-white/40'
                    "
                  ></button>
                }
              </div>
            </section>
          }
        }
      </div>

      <!-- Bottom Craft & Deliver Footer -->
      <div class="p-3.5 border-t border-white/10 bg-[#131519] space-y-2.5">
        <div class="flex items-center justify-between text-xs text-stone-300">
          <span>
            Uses:
            <strong class="text-stone-100">{{ requiredSummary() }}</strong>
          </span>
          <span class="font-mono-num text-stone-400">
            Hardware {{ metrics().materialCost }}c
          </span>
        </div>

        @if (!canCraft()) {
          <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-400/30 text-xs text-rose-200">
            <span>Missing material stock for this assembly.</span>
            <button
              type="button"
              (click)="goToMaterials.emit()"
              class="font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer shrink-0"
            >
              Get Materials
            </button>
          </div>
        }

        <div class="flex items-center gap-2">
          @if (pinnedOrder(); as order) {
            <button
              type="button"
              [disabled]="!canCraft()"
              (click)="deliverOrder.emit()"
              class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">local_shipping</mat-icon>
              <span>Deliver to {{ order.clientName }}</span>
            </button>
          }

          <button
            type="button"
            [disabled]="!canCraft()"
            (click)="craftForShowroom.emit()"
            class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            [class]="
              pinnedOrder()
                ? 'bg-[#22252d] text-stone-100 border border-white/15 hover:bg-[#2b2f39]'
                : 'flex-1 bg-amber-500 text-stone-950 font-semibold hover:bg-amber-400'
            "
          >
            <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">build</mat-icon>
            <span>{{ pinnedOrder() ? 'Store' : 'Craft Lamp' }}</span>
          </button>
        </div>
      </div>
    </aside>
  `,
})
export class WorkbenchControls {
  readonly blueprint = input.required<LampBlueprint>();
  readonly metrics = input.required<LampMetrics>();
  readonly inventory = input.required<MaterialInventory>();
  readonly pinnedOrder = input<CustomerOrder | null>(null);

  readonly updateBlueprint = output<Partial<LampBlueprint>>();
  readonly partSwapped = output<PartCategory>();
  readonly craftForShowroom = output<void>();
  readonly deliverOrder = output<void>();
  readonly goToMaterials = output<void>();

  readonly activeTab = signal<PartCategory>('base');

  readonly tabs: {id: PartCategory; label: string}[] = [
    {id: 'base', label: 'Base'},
    {id: 'stem', label: 'Stem'},
    {id: 'bulb', label: 'Bulb'},
    {id: 'shade', label: 'Shade'},
  ];

  readonly baseShapes = BASE_SHAPES;
  readonly stems = STEMS;
  readonly functionalities = FUNCTIONALITIES;
  readonly bulbs = BULBS;
  readonly shadeShapes = SHADE_SHAPES;
  readonly shadeTints = SHADE_TINTS;

  readonly structuralMaterials = MATERIAL_LIST.filter(
    (m) => m.category === 'structural' || m.category === 'both'
  );
  readonly diffuserMaterials = MATERIAL_LIST.filter(
    (m) => m.category === 'diffuser' || m.category === 'both'
  );

  readonly activeFunctionality = computed(
    () =>
      FUNCTIONALITIES.find((f) => f.id === this.blueprint().functionalityId) ??
      FUNCTIONALITIES[0]
  );

  readonly canCraft = computed(() =>
    hasMaterialsForBlueprint(this.inventory(), this.blueprint())
  );

  readonly requiredSummary = computed(() => {
    const reqs = getRequiredMaterialsForBlueprint(this.blueprint());
    return reqs
      .map((r) => `${r.count}x ${MATERIALS[r.materialId].name}`)
      .join(' · ');
  });

  onNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateBlueprint.emit({name: value});
  }

  selectBaseShape(baseShapeId: BaseShapeId): void {
    this.updateBlueprint.emit({baseShapeId});
    this.partSwapped.emit('base');
  }

  selectBaseMaterial(baseMaterialId: MaterialId): void {
    this.updateBlueprint.emit({baseMaterialId});
    this.partSwapped.emit('base');
  }

  selectStem(stemId: StemId): void {
    this.updateBlueprint.emit({stemId});
    this.partSwapped.emit('stem');
  }

  selectFunctionality(functionalityId: FunctionalityId): void {
    this.updateBlueprint.emit({functionalityId});
    this.partSwapped.emit('stem');
  }

  selectBulb(bulbId: BulbId): void {
    this.updateBlueprint.emit({bulbId});
    this.partSwapped.emit('bulb');
  }

  selectShadeShape(shadeShapeId: ShadeShapeId): void {
    this.updateBlueprint.emit({shadeShapeId});
    this.partSwapped.emit('shade');
  }

  selectShadeMaterial(shadeMaterialId: MaterialId): void {
    this.updateBlueprint.emit({shadeMaterialId});
    this.partSwapped.emit('shade');
  }

  selectTint(shadeTintHex: string): void {
    this.updateBlueprint.emit({shadeTintHex});
    this.partSwapped.emit('shade');
  }

  onDimmerChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.updateBlueprint.emit({dimmerLevel: val});
  }

  onTiltChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.updateBlueprint.emit({shadeTiltDeg: val});
  }

  onHeightChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.updateBlueprint.emit({stemHeightPct: val});
  }
}
