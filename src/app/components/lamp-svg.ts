import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {BULBS, MATERIALS, STEMS} from '../game/lamp.catalog';
import {LampBlueprint, LampMetrics} from '../game/lamp.types';

@Component({
  selector: 'app-lamp-svg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 280 340'"
      class="w-full h-full overflow-visible select-none"
      role="img"
      [attr.aria-label]="blueprint().name + (isLit() ? ' (lit)' : ' (off)')"
    >
      <defs>
        <!-- Radial bulb bloom -->
        <radialGradient [attr.id]="gradPrefix() + '_glow'" cx="50%" cy="50%" r="50%">
          <stop offset="0%" [attr.stop-color]="glowColorCss()" stop-opacity="0.95" />
          <stop offset="45%" [attr.stop-color]="glowColorCss()" stop-opacity="0.45" />
          <stop offset="100%" [attr.stop-color]="glowColorCss()" stop-opacity="0" />
        </radialGradient>

        <!-- Shade gradient -->
        <linearGradient [attr.id]="gradPrefix() + '_shade'" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" [attr.stop-color]="shadeHighlight()" />
          <stop offset="55%" [attr.stop-color]="shadeFill()" />
          <stop offset="100%" [attr.stop-color]="shadeShadow()" />
        </linearGradient>

        <!-- Base material gradient -->
        <linearGradient [attr.id]="gradPrefix() + '_base'" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" [attr.stop-color]="baseAccent()" />
          <stop offset="35%" [attr.stop-color]="baseColor()" />
          <stop offset="70%" [attr.stop-color]="baseColor()" />
          <stop offset="100%" [attr.stop-color]="baseAccent()" />
        </linearGradient>

        <!-- Stem metallic / wood gradient -->
        <linearGradient [attr.id]="gradPrefix() + '_stem'" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" [attr.stop-color]="stemDark()" />
          <stop offset="45%" [attr.stop-color]="stemLight()" />
          <stop offset="100%" [attr.stop-color]="stemDark()" />
        </linearGradient>
      </defs>

      <!-- Subtle base contact shadow -->
      <ellipse cx="140" cy="316" rx="54" ry="8" fill="rgba(0,0,0,0.52)" />

      <!-- BASE SILHOUETTE -->
      @switch (blueprint().baseShapeId) {
        @case ('turned_pedestal') {
          <g>
            <rect x="92" y="302" width="96" height="12" rx="4" [attr.fill]="'url(#' + gradPrefix() + '_base)'" stroke="#18181b" stroke-width="1.2" />
            <path d="M104 302 C104 288, 122 284, 124 274 L156 274 C158 284, 176 288, 176 302 Z" [attr.fill]="'url(#' + gradPrefix() + '_base)'" stroke="#18181b" stroke-width="1.2" />
            <ellipse cx="140" cy="274" rx="20" ry="5" [attr.fill]="baseAccent()" stroke="#18181b" stroke-width="1" />
          </g>
        }
        @case ('tripod_stand') {
          <g>
            <path d="M134 266 L94 314 L104 314 L140 272 Z" [attr.fill]="'url(#' + gradPrefix() + '_base)'" stroke="#18181b" stroke-width="1.2" />
            <path d="M146 266 L186 314 L176 314 L140 272 Z" [attr.fill]="'url(#' + gradPrefix() + '_base)'" stroke="#18181b" stroke-width="1.2" />
            <rect x="136" y="268" width="8" height="44" rx="3" [attr.fill]="baseAccent()" stroke="#18181b" stroke-width="1.2" />
            <rect x="122" y="260" width="36" height="12" rx="4" [attr.fill]="baseColor()" stroke="#18181b" stroke-width="1.2" />
          </g>
        }
        @case ('sculptural_urn') {
          <g>
            <rect x="108" y="304" width="64" height="10" rx="3" [attr.fill]="baseAccent()" stroke="#18181b" stroke-width="1.2" />
            <path d="M116 304 C98 288, 100 258, 124 252 L156 252 C180 258, 182 288, 164 304 Z" [attr.fill]="'url(#' + gradPrefix() + '_base)'" stroke="#18181b" stroke-width="1.2" />
            <rect x="124" y="246" width="32" height="8" rx="3" [attr.fill]="baseAccent()" />
          </g>
        }
        @case ('weighted_disc') {
          <g>
            <rect x="86" y="294" width="108" height="20" rx="8" [attr.fill]="'url(#' + gradPrefix() + '_base)'" stroke="#18181b" stroke-width="1.2" />
            <ellipse cx="140" cy="294" rx="50" ry="6" [attr.fill]="baseColor()" stroke="#18181b" stroke-width="1" />
            <rect x="126" y="282" width="28" height="12" rx="3" [attr.fill]="baseAccent()" />
          </g>
        }
      }

      <!-- STEM & ARM -->
      @switch (blueprint().stemId) {
        @case ('straight_column') {
          <g>
            <rect
              x="134"
              [attr.y]="headY()"
              width="12"
              [attr.height]="stemBaseY() - headY()"
              rx="4"
              [attr.fill]="'url(#' + gradPrefix() + '_stem)'"
              stroke="#18181b"
              stroke-width="1.2"
            />
            <rect x="128" [attr.y]="stemBaseY() - 10" width="24" height="10" rx="3" [attr.fill]="stemDark()" />
          </g>
        }
        @case ('goose_neck') {
          <g>
            <path
              [attr.d]="'M140 ' + stemBaseY() + ' L140 ' + (headY() + 42) + ' C140 ' + (headY() - 18) + ', 176 ' + (headY() - 18) + ', 176 ' + (headY() + 12)"
              fill="none"
              [attr.stroke]="'url(#' + gradPrefix() + '_stem)'"
              stroke-width="11"
              stroke-linecap="round"
            />
            <path
              [attr.d]="'M140 ' + stemBaseY() + ' L140 ' + (headY() + 42) + ' C140 ' + (headY() - 18) + ', 176 ' + (headY() - 18) + ', 176 ' + (headY() + 12)"
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              stroke-width="2"
              stroke-linecap="round"
            />
          </g>
        }
        @case ('cantilever_arc') {
          <g>
            <path
              [attr.d]="'M140 ' + stemBaseY() + ' C132 ' + (headY() + 40) + ', 108 ' + (headY() - 28) + ', 168 ' + (headY() - 12)"
              fill="none"
              [attr.stroke]="'url(#' + gradPrefix() + '_stem)'"
              stroke-width="10"
              stroke-linecap="round"
            />
            <circle cx="140" [attr.cy]="stemBaseY() - 8" r="7" [attr.fill]="stemDark()" stroke="#18181b" stroke-width="1" />
          </g>
        }
        @case ('counterweight_pulley') {
          <g>
            <rect x="135" [attr.y]="headY() - 10" width="10" [attr.height]="stemBaseY() - headY() + 10" rx="3" [attr.fill]="'url(#' + gradPrefix() + '_stem)'" stroke="#18181b" stroke-width="1" />
            <!-- Cross arm + pulley wheel -->
            <line x1="112" [attr.y1]="headY() - 6" x2="170" [attr.y2]="headY() - 6" [attr.stroke]="stemLight()" stroke-width="6" stroke-linecap="round" />
            <circle cx="114" [attr.cy]="headY() - 6" r="8" fill="#D4A84F" stroke="#18181b" stroke-width="1.2" />
            <line x1="114" [attr.y1]="headY() + 2" x2="114" [attr.y2]="headY() + 68" stroke="#A8A29E" stroke-width="2" />
            <rect x="106" [attr.y]="headY() + 68" width="16" height="22" rx="4" [attr.fill]="stemDark()" stroke="#18181b" stroke-width="1.2" />
          </g>
        }
      }

      <!-- LAMP HEAD GROUP (Socket + Bulb + Shade + Functionality Hardware) -->
      <g [attr.transform]="'translate(' + headX() + ',' + headY() + ') rotate(' + effectiveTilt() + ', 0, 12)'">
        <!-- Socket collar -->
        <rect x="-11" y="6" width="22" height="16" rx="3" fill="#B8903D" stroke="#18181b" stroke-width="1.2" />

        <!-- Functionality Hardware Indicator -->
        @switch (blueprint().functionalityId) {
          @case ('pull_chain') {
            <g class="cursor-pointer" (click)="onToggleSwitch($event)">
              <line x1="9" y1="18" x2="9" y2="56" stroke="#EAB308" stroke-width="2" stroke-dasharray="2 2" />
              <circle cx="9" cy="59" r="5.5" fill="#D4A84F" stroke="#18181b" stroke-width="1.2" />
            </g>
          }
          @case ('rotary_dimmer') {
            <g>
              <rect x="11" y="10" width="9" height="8" rx="2" fill="#D4A84F" stroke="#18181b" stroke-width="1" />
              <circle cx="20" cy="14" r="3" fill="#F59E0B" />
            </g>
          }
          @case ('pivot_task_arm') {
            <g>
              <circle cx="0" cy="6" r="6.5" fill="#475569" stroke="#18181b" stroke-width="1.2" />
              <circle cx="0" cy="6" r="2.2" fill="#F59E0B" />
            </g>
          }
          @case ('ambient_uplight') {
            <g>
              <path d="M-16 8 L16 8 L12 -4 L-12 -4 Z" fill="#D4A84F" stroke="#18181b" stroke-width="1" opacity="0.9" />
            </g>
          }
        }

        <!-- Ambient Glow Halo when Lit -->
        @if (isLit()) {
          <circle
            cx="0"
            cy="24"
            [attr.r]="glowRadius()"
            [attr.fill]="'url(#' + gradPrefix() + '_glow)'"
          />
        }

        <!-- Bulb -->
        <g>
          <path
            d="M-10 22 C-12 34, -9 44, 0 44 C9 44, 12 34, 10 22 Z"
            [attr.fill]="isLit() ? bulbGlowFill() : 'rgba(226,232,240,0.3)'"
            [attr.stroke]="isLit() ? bulbGlowFill() : '#64748b'"
            stroke-width="1"
          />
          @if (blueprint().bulbId === 'ember_filament' || blueprint().bulbId === 'edison_cage') {
            <path
              d="M-3 24 L-3 36 M3 24 L3 36 M-3 30 L3 34 M3 30 L-3 34"
              [attr.stroke]="isLit() ? '#FFF7ED' : '#94A3B8'"
              stroke-width="1.3"
              fill="none"
            />
          }
        </g>

        <!-- SHADE SILHOUETTE -->
        @switch (blueprint().shadeShapeId) {
          @case ('pleated_drum') {
            <g>
              <path
                d="M-54 -14 L54 -14 L68 38 L-68 38 Z"
                [attr.fill]="'url(#' + gradPrefix() + '_shade)'"
                [attr.fill-opacity]="shadeOpacity()"
                stroke="#18181b"
                stroke-width="1.4"
              />
              <!-- Pleat ribs -->
              @for (x of [-42, -28, -14, 0, 14, 28, 42]; track x) {
                <line [attr.x1]="x" y1="-13" [attr.x2]="x * 1.24" y2="37" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
              }
              <ellipse cx="0" cy="-14" rx="54" ry="7" [attr.fill]="shadeShadow()" opacity="0.65" />
            </g>
          }
          @case ('tiffany_dome') {
            <g>
              <path
                d="M-66 34 C-64 -20, -34 -32, 0 -32 C34 -32, 64 -20, 66 34 Z"
                [attr.fill]="'url(#' + gradPrefix() + '_shade)'"
                [attr.fill-opacity]="shadeOpacity()"
                stroke="#18181b"
                stroke-width="1.5"
              />
              <!-- Leaded mosaic ribs if stained glass or ornamental dome -->
              <path d="M-56 12 Q0 20 56 12" fill="none" stroke="#18181b" stroke-width="1.5" opacity="0.55" />
              <path d="M-40 -10 Q0 -4 40 -10" fill="none" stroke="#18181b" stroke-width="1.4" opacity="0.5" />
              @for (x of [-36, -18, 0, 18, 36]; track x) {
                <line x1="0" y1="-32" [attr.x2]="x * 1.6" y2="34" stroke="#18181b" stroke-width="1.3" opacity="0.5" />
              }
              <circle cx="0" cy="-34" r="5" fill="#D4A84F" stroke="#18181b" stroke-width="1.2" />
            </g>
          }
          @case ('spun_cone') {
            <g>
              <path
                d="M-18 -20 L18 -20 L58 34 L-58 34 Z"
                [attr.fill]="'url(#' + gradPrefix() + '_shade)'"
                [attr.fill-opacity]="shadeOpacity()"
                stroke="#18181b"
                stroke-width="1.4"
              />
              <ellipse cx="0" cy="34" rx="58" ry="6" [attr.fill]="isLit() ? glowColorCss() : '#27272a'" [attr.opacity]="isLit() ? 0.55 : 0.7" />
            </g>
          }
          @case ('glass_orb') {
            <g>
              <circle
                cx="0"
                cy="12"
                r="46"
                [attr.fill]="'url(#' + gradPrefix() + '_shade)'"
                [attr.fill-opacity]="shadeOpacity()"
                stroke="#18181b"
                stroke-width="1.3"
              />
              <!-- Subtle specular highlight -->
              <path d="M-26 -8 C-18 -22, -4 -26, 8 -24" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="3" stroke-linecap="round" />
            </g>
          }
          @case ('woven_bell') {
            <g>
              <path
                d="M-24 -22 C-34 2, -62 14, -64 38 L64 38 C62 14, 34 2, 24 -22 Z"
                [attr.fill]="'url(#' + gradPrefix() + '_shade)'"
                [attr.fill-opacity]="shadeOpacity()"
                stroke="#18181b"
                stroke-width="1.4"
              />
              @for (y of [-8, 4, 16, 28]; track y) {
                <line [attr.x1]="-24 - (y + 22) * 0.72" [attr.y1]="y" [attr.x2]="24 + (y + 22) * 0.72" [attr.y2]="y" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" />
              }
            </g>
          }
        }
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class LampSvg {
  readonly blueprint = input.required<LampBlueprint>();
  readonly metrics = input.required<LampMetrics>();
  readonly forceLit = input<boolean | null>(null);
  readonly uid = input<string>('main');
  readonly toggleSwitch = output<void>();

  readonly gradPrefix = computed(() => `lamp_${this.uid()}`);

  readonly isLit = computed(() => {
    const forced = this.forceLit();
    return forced !== null ? forced : this.blueprint().isLit;
  });

  readonly baseMat = computed(() => MATERIALS[this.blueprint().baseMaterialId]);
  readonly shadeMat = computed(() => MATERIALS[this.blueprint().shadeMaterialId]);
  readonly stemSpec = computed(
    () => STEMS.find((s) => s.id === this.blueprint().stemId) ?? STEMS[0]
  );
  readonly bulbSpec = computed(
    () => BULBS.find((b) => b.id === this.blueprint().bulbId) ?? BULBS[0]
  );

  readonly baseColor = computed(() => this.baseMat().colorHex);
  readonly baseAccent = computed(() => this.baseMat().accentHex);

  readonly stemLight = computed(() =>
    this.blueprint().baseMaterialId === 'oak' || this.blueprint().baseMaterialId === 'walnut'
      ? '#C49A45'
      : this.baseMat().colorHex
  );
  readonly stemDark = computed(() =>
    this.blueprint().baseMaterialId === 'oak' || this.blueprint().baseMaterialId === 'walnut'
      ? '#7C5E24'
      : this.baseMat().accentHex
  );

  readonly stemBaseY = computed(() => {
    switch (this.blueprint().baseShapeId) {
      case 'sculptural_urn':
        return 248;
      case 'tripod_stand':
        return 262;
      case 'weighted_disc':
        return 284;
      default:
        return 274;
    }
  });

  readonly headY = computed(() => {
    const baseHeight = 148 * this.stemSpec().heightFactor;
    const heightAdjust = ((this.blueprint().stemHeightPct - 50) / 50) * 26;
    return Math.round(Math.max(66, Math.min(165, this.stemBaseY() - baseHeight - heightAdjust)));
  });

  readonly headX = computed(() => {
    switch (this.blueprint().stemId) {
      case 'goose_neck':
        return 176;
      case 'cantilever_arc':
        return 168;
      case 'counterweight_pulley':
        return 168;
      default:
        return 140;
    }
  });

  readonly effectiveTilt = computed(() =>
    this.blueprint().functionalityId === 'pivot_task_arm'
      ? this.blueprint().shadeTiltDeg
      : 0
  );

  readonly glowColorCss = computed(() => {
    const {r, g, b} = this.metrics().lightColorRgb;
    return `rgb(${r}, ${g}, ${b})`;
  });

  readonly bulbGlowFill = computed(() =>
    this.isLit() ? this.bulbSpec().filamentColor : '#94a3b8'
  );

  readonly glowRadius = computed(() => {
    const lm = this.metrics().effectiveLumens;
    return Math.round(68 + Math.min(72, (lm / 1100) * 72));
  });

  readonly shadeFill = computed(() => {
    const mat = this.shadeMat();
    if (mat.id === 'stained_glass' || mat.id === 'linen' || mat.id === 'opaline_glass') {
      return this.blueprint().shadeTintHex;
    }
    return mat.colorHex;
  });

  readonly shadeHighlight = computed(() => {
    if (this.isLit() && this.shadeMat().translucency > 0.45) {
      return this.glowColorCss();
    }
    return this.shadeFill();
  });

  readonly shadeShadow = computed(() => this.shadeMat().accentHex);

  readonly shadeOpacity = computed(() => {
    const mat = this.shadeMat();
    if (mat.id === 'opaline_glass' || mat.id === 'smoked_glass') {
      return this.isLit() ? 0.88 : 0.78;
    }
    if (mat.id === 'stained_glass' || mat.id === 'linen') {
      return this.isLit() ? 0.92 : 0.96;
    }
    return 0.98;
  });

  onToggleSwitch(event: Event): void {
    event.stopPropagation();
    this.toggleSwitch.emit();
  }
}
