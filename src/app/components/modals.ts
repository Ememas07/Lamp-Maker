import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {CustomerOrder, OrderEvaluation} from '../game/lamp.types';

@Component({
  selector: 'app-appraisal-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      class="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appraisal-title"
    >
      <div class="w-full max-w-md rounded-2xl bg-[#181a20] border border-white/15 p-6 space-y-5 shadow-2xl">
        <div class="text-center space-y-2">
          <div class="flex items-center justify-center gap-1.5 text-amber-400">
            @for (starIdx of [1, 2, 3]; track starIdx) {
              <mat-icon class="!text-[28px] !w-7 !h-7">
                {{ starIdx <= evaluation().stars ? 'star' : 'star_border' }}
              </mat-icon>
            }
          </div>
          <h2 id="appraisal-title" class="font-display text-2xl font-semibold text-stone-100">
            Delivered to {{ order().clientName }}
          </h2>
          <p class="text-sm text-stone-300">{{ evaluation().verdict }}</p>
        </div>

        <!-- Stat summary -->
        <div class="grid grid-cols-3 gap-2.5 text-center p-3 rounded-xl bg-[#121418] border border-white/8">
          <div>
            <div class="text-[11px] uppercase tracking-wider text-stone-400">Match</div>
            <div class="font-mono-num text-lg font-semibold text-stone-100">
              {{ evaluation().score }}%
            </div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-stone-400">Earned</div>
            <div class="font-mono-num text-lg font-semibold text-amber-300">
              +{{ evaluation().coinsEarned }}c
            </div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-stone-400">Reputation</div>
            <div class="font-mono-num text-lg font-semibold text-emerald-400">
              +{{ evaluation().reputationEarned }}
            </div>
          </div>
        </div>

        <!-- Spec breakdown -->
        <div class="space-y-1.5 text-xs">
          <div class="flex items-center justify-between py-1 border-b border-white/5">
            <span class="text-stone-400">Style Match</span>
            <span [class]="evaluation().styleMatched ? 'text-emerald-400' : 'text-rose-300'">
              {{ evaluation().styleMatched ? 'Matched' : 'Missed' }}
            </span>
          </div>
          <div class="flex items-center justify-between py-1 border-b border-white/5">
            <span class="text-stone-400">Material Match</span>
            <span [class]="evaluation().materialMatched ? 'text-emerald-400' : 'text-rose-300'">
              {{ evaluation().materialMatched ? 'Matched' : 'Missed' }}
            </span>
          </div>
          <div class="flex items-center justify-between py-1 border-b border-white/5">
            <span class="text-stone-400">Functionality</span>
            <span [class]="evaluation().functionalityMatched ? 'text-emerald-400' : 'text-rose-300'">
              {{ evaluation().functionalityMatched ? 'Matched' : 'Missed' }}
            </span>
          </div>
          <div class="flex items-center justify-between py-1 border-b border-white/5">
            <span class="text-stone-400">Color Temperature</span>
            <span [class]="evaluation().kelvinMatched ? 'text-emerald-400' : 'text-rose-300'">
              {{ evaluation().kelvinMatched ? 'In Range' : 'Off Target' }}
            </span>
          </div>
          <div class="flex items-center justify-between py-1">
            <span class="text-stone-400">Lumen Brightness</span>
            <span [class]="evaluation().lumensMatched ? 'text-emerald-400' : 'text-rose-300'">
              {{ evaluation().lumensMatched ? 'In Range' : 'Off Target' }}
            </span>
          </div>
        </div>

        <button
          type="button"
          (click)="closeModal.emit()"
          class="w-full py-2.5 rounded-xl bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors cursor-pointer"
        >
          Continue in Workshop
        </button>
      </div>
    </div>
  `,
})
export class AppraisalModal {
  readonly order = input.required<CustomerOrder>();
  readonly evaluation = input.required<OrderEvaluation>();
  readonly closeModal = output<void>();
}

@Component({
  selector: 'app-pause-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      class="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div class="w-full max-w-sm rounded-2xl bg-[#181a20] border border-white/15 p-6 space-y-5 shadow-2xl">
        <div class="text-center space-y-1">
          <h2 id="pause-title" class="font-display text-2xl font-semibold text-stone-100">
            Workshop Paused
          </h2>
          <p class="text-xs text-stone-400">Progress is automatically saved to this browser.</p>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-[#121418] border border-white/8">
          <div>
            <div class="text-[11px] text-stone-400">Crafted</div>
            <div class="font-mono-num text-base font-semibold text-stone-100">{{ lampsCount() }}</div>
          </div>
          <div>
            <div class="text-[11px] text-stone-400">Orders</div>
            <div class="font-mono-num text-base font-semibold text-amber-300">{{ ordersCompleted() }}</div>
          </div>
          <div>
            <div class="text-[11px] text-stone-400">Sales</div>
            <div class="font-mono-num text-base font-semibold text-emerald-400">{{ salesCount() }}</div>
          </div>
        </div>

        <div class="space-y-2">
          <button
            type="button"
            (click)="resumeWorkshop.emit()"
            class="w-full py-2.5 rounded-xl bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Resume Workshop
          </button>
          <button
            type="button"
            (click)="backToTitle.emit()"
            class="w-full py-2.5 rounded-xl bg-[#22252d] border border-white/12 text-stone-200 font-medium text-sm hover:bg-[#2b2f39] transition-colors cursor-pointer"
          >
            Title Screen
          </button>
          <button
            type="button"
            (click)="resetCareer.emit()"
            class="w-full py-2.5 rounded-xl bg-transparent border border-rose-500/30 text-rose-300 font-medium text-sm hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            Reset Workshop
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PauseModal {
  readonly lampsCount = input.required<number>();
  readonly ordersCompleted = input.required<number>();
  readonly salesCount = input.required<number>();

  readonly resumeWorkshop = output<void>();
  readonly backToTitle = output<void>();
  readonly resetCareer = output<void>();
}

@Component({
  selector: 'app-mastery-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <div class="w-full max-w-md rounded-2xl bg-[#181a20] border border-amber-400/40 p-6 space-y-5 shadow-2xl text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/15 text-amber-400 mx-auto">
          <mat-icon class="!text-[28px] !w-7 !h-7">workspace_premium</mat-icon>
        </div>

        <div class="space-y-1.5">
          <h2 id="victory-title" class="font-display text-2xl sm:text-3xl font-semibold text-stone-100">
            Master Lampmaker
          </h2>
          <p class="text-sm text-stone-300">
            Your atelier has earned citywide renown across bespoke lighting commissions and showroom exhibitions.
          </p>
        </div>

        <div class="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-[#121418] border border-white/8">
          <div>
            <div class="text-[11px] uppercase text-stone-400">Reputation</div>
            <div class="font-mono-num text-lg font-semibold text-emerald-400">{{ reputation() }}</div>
          </div>
          <div>
            <div class="text-[11px] uppercase text-stone-400">Treasury</div>
            <div class="font-mono-num text-lg font-semibold text-amber-300">{{ coins() }}c</div>
          </div>
          <div>
            <div class="text-[11px] uppercase text-stone-400">Crafted</div>
            <div class="font-mono-num text-lg font-semibold text-stone-100">{{ lampsCount() }}</div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            (click)="continueEndless.emit()"
            class="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Continue Atelier
          </button>
          <button
            type="button"
            (click)="startFresh.emit()"
            class="py-2.5 px-4 rounded-xl bg-[#22252d] border border-white/12 text-stone-200 font-medium text-sm hover:bg-[#2b2f39] transition-colors cursor-pointer"
          >
            New Career
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MasteryModal {
  readonly reputation = input.required<number>();
  readonly coins = input.required<number>();
  readonly lampsCount = input.required<number>();

  readonly continueEndless = output<void>();
  readonly startFresh = output<void>();
}
