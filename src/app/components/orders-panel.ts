import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {FUNCTIONALITIES, MATERIALS} from '../game/lamp.catalog';
import {evaluateOrderFulfillment, hasMaterialsForBlueprint} from '../game/lamp.engine';
import {
  CustomerOrder,
  LampBlueprint,
  LampMetrics,
  MaterialInventory,
} from '../game/lamp.types';

@Component({
  selector: 'app-orders-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="font-display text-2xl sm:text-3xl font-semibold text-stone-100">
            Customer Commissions
          </h2>
          <p class="text-sm text-stone-400 mt-1">
            Pin a client brief to your workbench, match their requested style, material, and optics, and earn coins & reputation.
          </p>
        </div>
        <button
          type="button"
          (click)="refreshOrders.emit()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1d2026] border border-white/15 text-sm font-medium text-stone-200 hover:bg-[#262a32] transition-colors cursor-pointer whitespace-nowrap"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">refresh</mat-icon>
          <span>Refresh Board</span>
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        @for (item of evaluatedOrders(); track item.order.id) {
          <article
            class="flex flex-col justify-between p-5 rounded-xl bg-[#17191e] border transition-colors"
            [class]="
              pinnedOrderId() === item.order.id
                ? 'border-amber-400'
                : 'border-white/10'
            "
          >
            <div class="space-y-4">
              <!-- Client Header -->
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="font-display text-lg font-semibold text-stone-100">
                    {{ item.order.clientName }}
                  </h3>
                  <p class="text-xs text-stone-400">
                    {{ item.order.clientRole }} · Tier {{ item.order.tier }}
                  </p>
                </div>
                <div class="text-right font-mono-num">
                  <div class="text-sm font-semibold text-amber-300">
                    +{{ item.order.rewardCoins }}c
                  </div>
                  <div class="text-xs text-emerald-400">
                    +{{ item.order.rewardReputation }} Rep
                  </div>
                </div>
              </div>

              <!-- Dialogue Quote -->
              <p class="text-sm text-stone-300 leading-relaxed bg-[#121418] p-3 rounded-lg border border-white/5">
                "{{ item.order.dialogue }}"
              </p>

              <!-- Spec Checklist compared against Current Workbench Lamp -->
              <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between text-stone-400 pb-1 border-b border-white/5">
                  <span>Specification</span>
                  <span class="font-mono-num">Workbench Match: {{ item.eval.score }}%</span>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <span class="text-stone-400">Style</span>
                  <span
                    class="inline-flex items-center gap-1 font-medium"
                    [class]="item.eval.styleMatched ? 'text-emerald-400' : 'text-stone-200'"
                  >
                    <mat-icon class="!text-[14px] !w-3.5 !h-3.5">
                      {{ item.eval.styleMatched ? 'check_circle' : 'radio_button_unchecked' }}
                    </mat-icon>
                    {{ item.order.preferredStyle }}
                  </span>
                </div>

                @if (item.order.requiredMaterial; as matId) {
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-stone-400">Material</span>
                    <span
                      class="inline-flex items-center gap-1 font-medium"
                      [class]="item.eval.materialMatched ? 'text-emerald-400' : 'text-stone-200'"
                    >
                      <mat-icon class="!text-[14px] !w-3.5 !h-3.5">
                        {{ item.eval.materialMatched ? 'check_circle' : 'radio_button_unchecked' }}
                      </mat-icon>
                      {{ materialName(matId) }}
                    </span>
                  </div>
                }

                @if (item.order.requiredFunctionality; as fnId) {
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-stone-400">Feature</span>
                    <span
                      class="inline-flex items-center gap-1 font-medium"
                      [class]="item.eval.functionalityMatched ? 'text-emerald-400' : 'text-stone-200'"
                    >
                      <mat-icon class="!text-[14px] !w-3.5 !h-3.5">
                        {{ item.eval.functionalityMatched ? 'check_circle' : 'radio_button_unchecked' }}
                      </mat-icon>
                      {{ functionalityName(fnId) }}
                    </span>
                  </div>
                }

                <div class="flex items-center justify-between gap-2">
                  <span class="text-stone-400">Warmth</span>
                  <span
                    class="inline-flex items-center gap-1 font-mono-num"
                    [class]="item.eval.kelvinMatched ? 'text-emerald-400' : 'text-stone-200'"
                  >
                    <mat-icon class="!text-[14px] !w-3.5 !h-3.5">
                      {{ item.eval.kelvinMatched ? 'check_circle' : 'radio_button_unchecked' }}
                    </mat-icon>
                    {{ item.order.kelvinRange[0] }}–{{ item.order.kelvinRange[1] }}K
                  </span>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <span class="text-stone-400">Brightness</span>
                  <span
                    class="inline-flex items-center gap-1 font-mono-num"
                    [class]="item.eval.lumensMatched ? 'text-emerald-400' : 'text-stone-200'"
                  >
                    <mat-icon class="!text-[14px] !w-3.5 !h-3.5">
                      {{ item.eval.lumensMatched ? 'check_circle' : 'radio_button_unchecked' }}
                    </mat-icon>
                    {{ item.order.lumensRange[0] }}–{{ item.order.lumensRange[1] }} lm
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-5 pt-3 border-t border-white/8 flex items-center gap-2">
              <button
                type="button"
                (click)="pinOrder.emit(item.order)"
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                [class]="
                  pinnedOrderId() === item.order.id
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                    : 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                "
              >
                <mat-icon class="!text-[16px] !w-4 !h-4">push_pin</mat-icon>
                <span>{{ pinnedOrderId() === item.order.id ? 'Pinned · Open Bench' : 'Accept & Craft' }}</span>
              </button>

              <button
                type="button"
                [disabled]="!canCraftCurrent()"
                (click)="deliverOrder.emit(item.order)"
                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#22252d] border border-white/15 text-xs font-medium text-stone-100 hover:bg-[#2b2f39] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
              >
                <mat-icon class="!text-[16px] !w-4 !h-4">send</mat-icon>
                <span>Deliver Now</span>
              </button>
            </div>
          </article>
        }
      </div>
    </div>
  `,
})
export class OrdersPanel {
  readonly orders = input.required<CustomerOrder[]>();
  readonly pinnedOrderId = input<string | null>(null);
  readonly currentBlueprint = input.required<LampBlueprint>();
  readonly currentMetrics = input.required<LampMetrics>();
  readonly inventory = input.required<MaterialInventory>();

  readonly pinOrder = output<CustomerOrder>();
  readonly deliverOrder = output<CustomerOrder>();
  readonly refreshOrders = output<void>();

  readonly canCraftCurrent = computed(() =>
    hasMaterialsForBlueprint(this.inventory(), this.currentBlueprint())
  );

  readonly evaluatedOrders = computed(() =>
    this.orders().map((order) => ({
      order,
      eval: evaluateOrderFulfillment(
        this.currentBlueprint(),
        this.currentMetrics(),
        order
      ),
    }))
  );

  materialName(id: string): string {
    return MATERIALS[id as keyof typeof MATERIALS]?.name ?? id;
  }

  functionalityName(id: string): string {
    return FUNCTIONALITIES.find((f) => f.id === id)?.name ?? id;
  }
}
