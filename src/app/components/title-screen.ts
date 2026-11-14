import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {INITIAL_BLUEPRINT} from '../game/lamp.catalog';
import {computeLampMetrics} from '../game/lamp.engine';
import {LampBlueprint} from '../game/lamp.types';
import {LampSvg} from './lamp-svg';

@Component({
  selector: 'app-title-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LampSvg, MatIconModule],
  template: `
    <div
      class="relative min-h-screen w-full overflow-hidden bg-[#101114] text-stone-100 flex flex-col justify-between"
      (mousemove)="onMouseMove($event)"
    >
      <!-- Ambient radial glow tied to showcase lamp state -->
      <div
        class="pointer-events-none absolute inset-0 transition-opacity duration-500"
        [style.opacity]="previewLit() ? 1 : 0.15"
        [style.background]="
          'radial-gradient(circle at 68% 45%, rgba(245, 175, 85, 0.24) 0%, rgba(180, 110, 40, 0.08) 38%, rgba(16, 17, 20, 0) 70%)'
        "
      ></div>

      <!-- Main Split Stage: Left 40% Calm Negative Space Lockup + Right 60% Interactive Centerpiece -->
      <main
        class="relative z-10 flex-1 w-full max-w-6xl mx-auto px-6 sm:px-10 py-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8"
      >
        <!-- Left Title Lockup -->
        <section class="lg:col-span-6 flex flex-col items-start gap-6 max-w-xl">
          <!-- Custom Inline SVG Emblem -->
          <div class="flex items-center gap-3.5">
            <svg
              viewBox="0 0 48 48"
              class="w-11 h-11 shrink-0"
              aria-hidden="true"
            >
              <circle cx="24" cy="24" r="22" fill="#1A1C21" stroke="#D4A84F" stroke-width="1.5" />
              <path d="M15 24 L19 13 L29 13 L33 24 Z" fill="#F59E0B" />
              <line x1="24" y1="24" x2="24" y2="35" stroke="#D4A84F" stroke-width="2.2" />
              <rect x="17" y="35" width="14" height="3" rx="1.5" fill="#D4A84F" />
            </svg>
            <span class="text-xs tracking-[0.18em] uppercase text-amber-300/90 font-medium">
              Artisanal Lighting Studio
            </span>
          </div>

          <h1 class="font-display text-5xl sm:text-6xl font-semibold tracking-tight text-stone-50 leading-[1.06] text-balance">
            Lumen Atelier
          </h1>

          <p class="text-base sm:text-lg text-stone-300 leading-relaxed max-w-md">
            Gather oak, spun brass, and stained glass. Engineer warm lighting commissions and curate your own glowing showroom.
          </p>

          <div class="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="button"
              data-start="true"
              (click)="startGame.emit()"
              class="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-500 text-stone-950 font-semibold text-base hover:bg-amber-400 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-[0_8px_30px_rgba(245,158,11,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <mat-icon class="!text-[20px] !w-5 !h-5">lightbulb</mat-icon>
              <span>{{ hasSavedProgress() ? 'Enter Workshop' : 'Open Workshop' }}</span>
            </button>

            <button
              type="button"
              (click)="togglePreview()"
              class="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl border border-white/15 bg-[#181A1F] text-stone-200 text-sm font-medium hover:bg-[#22252C] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">tungsten</mat-icon>
              <span>{{ previewLit() ? 'Dim Showcase' : 'Light Showcase' }}</span>
            </button>
          </div>
        </section>

        <!-- Right Interactive Lamp Centerpiece -->
        <section
          class="lg:col-span-6 flex flex-col items-center justify-center relative"
          aria-label="Interactive showcase lamp"
        >
          <div
            class="relative w-[280px] sm:w-[340px] h-[340px] sm:h-[400px] transition-transform duration-150 ease-out"
            [style.transform]="parallaxTransform()"
          >
            <app-lamp-svg
              [blueprint]="showcaseBlueprint()"
              [metrics]="showcaseMetrics()"
              [forceLit]="previewLit()"
              uid="title_hero"
              (toggleSwitch)="togglePreview()"
            />
          </div>

          <!-- Plinth beneath showcase lamp -->
          <div class="w-64 h-4 rounded-full bg-gradient-to-b from-[#2a241d] to-[#141518] border-t border-white/10 -mt-3"></div>
          <p class="mt-3 text-xs text-stone-400">
            Click the brass pull-chain or button to test the showcase filament
          </p>
        </section>
      </main>

      <!-- Flat single-line bottom control hint -->
      <footer class="relative z-10 w-full px-6 py-4 border-t border-white/5 text-center text-xs text-stone-400">
        Assemble Parts in Workbench · Gather & Buy Materials · Fulfill NPC Orders · Arrange Lamps in Showroom · Space Toggle Light · Enter Start
      </footer>
    </div>
  `,
})
export class TitleScreen {
  readonly hasSavedProgress = input<boolean>(false);
  readonly startGame = output<void>();

  readonly previewLit = signal(true);
  private readonly tiltX = signal(0);
  private readonly tiltY = signal(0);

  readonly showcaseBlueprint = computed<LampBlueprint>(() => ({
    ...INITIAL_BLUEPRINT,
    name: 'Atelier Showcase',
    baseShapeId: 'turned_pedestal',
    baseMaterialId: 'brass',
    stemId: 'counterweight_pulley',
    functionalityId: 'pull_chain',
    bulbId: 'edison_cage',
    shadeShapeId: 'tiffany_dome',
    shadeMaterialId: 'stained_glass',
    shadeTintHex: '#E0953B',
    isLit: this.previewLit(),
  }));

  readonly showcaseMetrics = computed(() =>
    computeLampMetrics(this.showcaseBlueprint())
  );

  readonly parallaxTransform = computed(
    () => `translate3d(${this.tiltX()}px, ${this.tiltY()}px, 0)`
  );

  togglePreview(): void {
    this.previewLit.update((v) => !v);
  }

  onMouseMove(event: MouseEvent): void {
    if (typeof window === 'undefined') return;
    const nx = (event.clientX / window.innerWidth - 0.5) * 14;
    const ny = (event.clientY / window.innerHeight - 0.5) * 10;
    this.tiltX.set(Math.round(nx));
    this.tiltY.set(Math.round(ny));
  }
}
