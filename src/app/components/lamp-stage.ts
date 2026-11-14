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
  viewChild,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MATERIALS, STEMS} from '../game/lamp.catalog';
import {LampBlueprint, LampMetrics, RoomSettingId} from '../game/lamp.types';
import {LampSvg} from './lamp-svg';

interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

@Component({
  selector: 'app-lamp-stage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LampSvg, MatIconModule],
  template: `
    <div
      class="relative w-full h-full min-h-[340px] rounded-xl overflow-hidden border border-white/10 bg-[#14161a]"
      data-testid="lamp-stage"
    >
      <!-- Real-time Volumetric Light & Room Atmosphere Canvas -->
      <canvas
        #lightCanvas
        class="absolute inset-0 w-full h-full block pointer-events-none"
      ></canvas>

      <!-- Top-left Room Ambience Label (unboxed metadata) -->
      <div class="absolute top-3.5 left-4 z-10 flex items-center gap-2 text-xs text-stone-300/85 pointer-events-none">
        <span class="font-medium text-stone-100">{{ roomTitle() }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ blueprint().isLit ? 'Power On' : 'Power Off' }}</span>
      </div>

      <!-- Top-right Direct Light Switch Button -->
      <div class="absolute top-3 right-3.5 z-10 flex items-center gap-2">
        <button
          type="button"
          (click)="toggleLight.emit()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          [class]="
            blueprint().isLit
              ? 'bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400'
              : 'bg-[#1d2026] text-stone-200 border-white/15 hover:bg-[#262a32]'
          "
          [attr.aria-pressed]="blueprint().isLit"
          aria-label="Toggle lamp power switch"
        >
          <mat-icon class="!text-[16px] !w-4 !h-4">power_settings_new</mat-icon>
          <span>{{ blueprint().isLit ? 'Switch Off' : 'Switch On' }}</span>
        </button>
      </div>

      <!-- Centered Interactive SVG Lamp sitting on the workbench surface -->
      <div class="absolute inset-0 flex items-end justify-center pb-12 pointer-events-none">
        <div class="w-[230px] sm:w-[260px] h-[290px] sm:h-[325px] pointer-events-auto">
          <app-lamp-svg
            [blueprint]="blueprint()"
            [metrics]="metrics()"
            uid="workbench"
            (toggleSwitch)="toggleLight.emit()"
          />
        </div>
      </div>

      <!-- Bottom Live Photometric Readout Strip -->
      <div
        class="absolute bottom-0 inset-x-0 px-4 py-2.5 bg-[#111215]/92 border-t border-white/10 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-300">
          <span class="font-mono-num">
            <span class="text-stone-400">Temp </span>
            <strong class="text-amber-300 font-semibold">{{ metrics().effectiveKelvin }}K</strong>
          </span>
          <span aria-hidden="true" class="text-stone-600">·</span>
          <span class="font-mono-num">
            <span class="text-stone-400">Output </span>
            <strong class="text-stone-100 font-semibold">
              {{ blueprint().isLit ? metrics().effectiveLumens : 0 }} lm
            </strong>
          </span>
          <span aria-hidden="true" class="text-stone-600">·</span>
          <span class="font-mono-num">
            <span class="text-stone-400">Beam </span>
            <strong class="text-stone-100 font-semibold">{{ metrics().beamAngleDeg }}°</strong>
          </span>
          <span aria-hidden="true" class="text-stone-600">·</span>
          <span>
            <span class="text-stone-400">Style </span>
            <strong class="text-stone-100 font-semibold">{{ metrics().dominantStyle }}</strong>
          </span>
        </div>

        <div class="flex items-center gap-3 font-mono-num text-stone-300">
          <span>
            <span class="text-stone-400">Craft </span>
            <strong class="text-emerald-400 font-semibold">{{ metrics().craftScore }}</strong>
          </span>
          <span aria-hidden="true" class="text-stone-600">·</span>
          <span>
            <span class="text-stone-400">Est. Value </span>
            <strong class="text-amber-300 font-semibold">{{ metrics().estimatedValue }}c</strong>
          </span>
        </div>
      </div>
    </div>
  `,
})
export class LampStage {
  readonly blueprint = input.required<LampBlueprint>();
  readonly metrics = input.required<LampMetrics>();
  readonly roomSetting = input<RoomSettingId>('reading_nook');
  readonly toggleLight = output<void>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('lightCanvas');
  private readonly destroyRef = inject(DestroyRef);

  private readonly dustPool: DustMote[] = Array.from({length: 34}, (_, i) => ({
    x: ((i * 73) % 100) / 100,
    y: ((i * 41) % 82) / 100,
    vx: ((i % 5) - 2) * 0.004,
    vy: -0.005 - (i % 4) * 0.0025,
    r: 1 + (i % 3) * 0.65,
    alpha: 0.25 + (i % 4) * 0.15,
  }));

  readonly roomTitle = computed(() => {
    switch (this.roomSetting()) {
      case 'jazz_study':
        return 'Midnight Vinyl Study';
      case 'sunroom':
        return 'Botanical Conservatory';
      case 'drafting_loft':
        return 'Architect Drafting Loft';
      case 'dining_alcove':
        return 'Bistro Dining Alcove';
      default:
        return 'Evening Reading Nook';
    }
  });

  constructor() {
    let rafId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let width = 800;
    let height = 460;

    afterNextRender(() => {
      const canvasEl = this.canvasRef()?.nativeElement;
      if (!canvasEl) return;
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      const updateSize = () => {
        const rect = canvasEl.getBoundingClientRect();
        width = Math.max(300, Math.round(rect.width));
        height = Math.max(240, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasEl.width = width * dpr;
        canvasEl.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      updateSize();
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(canvasEl);

      let lastTime = performance.now();
      const render = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        this.drawScene(ctx, width, height, dt, now / 1000);
        rafId = requestAnimationFrame(render);
      };

      rafId = requestAnimationFrame(render);

      this.destroyRef.onDestroy(() => {
        cancelAnimationFrame(rafId);
        resizeObserver?.disconnect();
      });
    });
  }

  private drawScene(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dt: number,
    elapsed: number
  ): void {
    const bp = this.blueprint();
    const m = this.metrics();
    const {r, g, b} = m.lightColorRgb;
    const isLit = bp.isLit;
    const intensity = isLit ? Math.min(1.15, m.effectiveLumens / 720) : 0;

    // 1. Twilight wall background
    const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
    wallGrad.addColorStop(0, '#13151a');
    wallGrad.addColorStop(0.75, '#191c22');
    wallGrad.addColorStop(1, '#121316');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle wainscoting / architectural wall paneling
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    const panelY = h * 0.62;
    ctx.beginPath();
    ctx.moveTo(0, panelY);
    ctx.lineTo(w, panelY);
    ctx.stroke();

    // Calculate approximate lamp head center in canvas space aligned with SVG lamp
    const stemSpec = STEMS.find((s) => s.id === bp.stemId) ?? STEMS[0];
    const tableY = h - 78;
    const svgHeight = Math.min(325, h * 0.78);
    const headFrac = 0.38 - ((bp.stemHeightPct - 50) / 100) * 0.08 - (stemSpec.heightFactor - 1) * 0.14;
    const headY = Math.max(h * 0.22, tableY - svgHeight * (1 - headFrac));
    const headXOffset =
      bp.stemId === 'straight_column' ? 0 : w * 0.022;
    const headX = w * 0.5 + headXOffset;
    const tiltRad =
      bp.functionalityId === 'pivot_task_arm'
        ? (bp.shadeTiltDeg * Math.PI) / 180
        : 0;

    // 2. Ambient Wall Wash behind lamp
    if (isLit) {
      const washRadius = Math.max(w, h) * (0.44 + intensity * 0.32);
      const wallWash = ctx.createRadialGradient(
        headX,
        headY + 18,
        16,
        headX,
        headY + 32,
        washRadius
      );
      wallWash.addColorStop(0, `rgba(${r},${g},${b},${0.36 * intensity})`);
      wallWash.addColorStop(0.45, `rgba(${r},${g},${b},${0.14 * intensity})`);
      wallWash.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = wallWash;
      ctx.fillRect(0, 0, w, h);

      // Uplight ceiling bounce
      if (m.uplightRatio > 0.15) {
        const upAlpha = Math.min(0.42, m.uplightRatio * 0.5 * intensity);
        const upGrad = ctx.createRadialGradient(
          headX,
          headY - 12,
          14,
          headX,
          0,
          w * 0.45
        );
        upGrad.addColorStop(0, `rgba(${r},${g},${b},${upAlpha})`);
        upGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = upGrad;
        ctx.fillRect(0, 0, w, h * 0.55);
      }

      // Stained glass jewel refraction pattern
      if (bp.shadeMaterialId === 'stained_glass') {
        const pulse = 0.85 + Math.sin(elapsed * 1.4) * 0.1;
        const jewels = [
          {dx: -85, dy: -20, color: `rgba(245, 158, 11, ${0.14 * pulse})`},
          {dx: 92, dy: -15, color: `rgba(16, 185, 129, ${0.12 * pulse})`},
          {dx: -55, dy: 45, color: `rgba(217, 119, 54, ${0.13 * pulse})`},
          {dx: 62, dy: 48, color: `rgba(59, 130, 246, ${0.11 * pulse})`},
        ];
        for (const j of jewels) {
          const jGrad = ctx.createRadialGradient(
            headX + j.dx,
            headY + j.dy,
            4,
            headX + j.dx,
            headY + j.dy,
            68
          );
          jGrad.addColorStop(0, j.color);
          jGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = jGrad;
          ctx.fillRect(0, 0, w, h);
        }
      }

      // 3. Directional Volumetric Cone originating from the bottom shade rim
      const apertureY = headY + 28;
      const halfSpread = ((m.beamAngleDeg * 0.48) * Math.PI) / 180;
      const coneLen = Math.max(120, tableY - apertureY + 14);
      const leftAngle = Math.PI / 2 + tiltRad - halfSpread;
      const rightAngle = Math.PI / 2 + tiltRad + halfSpread;
      const rimHalfW = 46;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(headX - rimHalfW, apertureY);
      ctx.lineTo(headX + rimHalfW, apertureY);
      ctx.lineTo(
        headX + rimHalfW + Math.cos(leftAngle) * coneLen,
        apertureY + Math.sin(leftAngle) * coneLen
      );
      ctx.lineTo(
        headX - rimHalfW + Math.cos(rightAngle) * coneLen,
        apertureY + Math.sin(rightAngle) * coneLen
      );
      ctx.closePath();

      const coneGrad = ctx.createLinearGradient(headX, apertureY, headX, apertureY + coneLen);
      const coneAlpha = Math.min(0.42, (0.2 + (1 - m.diffusion) * 0.16) * intensity);
      coneGrad.addColorStop(0, `rgba(${r},${g},${b},${coneAlpha})`);
      coneGrad.addColorStop(0.7, `rgba(${r},${g},${b},${coneAlpha * 0.42})`);
      coneGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = coneGrad;
      ctx.fill();
      ctx.restore();
    }

    // 4. Room Setting Props (silhouettes that catch light)
    this.drawRoomProps(ctx, w, h, isLit ? intensity : 0, r, g, b);

    // 5. Oak Workbench / Table Surface
    const tableGrad = ctx.createLinearGradient(0, tableY, 0, h);
    tableGrad.addColorStop(0, isLit ? '#3a2b20' : '#231d19');
    tableGrad.addColorStop(0.2, '#241c16');
    tableGrad.addColorStop(1, '#141210');
    ctx.fillStyle = tableGrad;
    ctx.fillRect(0, tableY, w, h - tableY);

    // Table edge highlight catching lamp beam
    if (isLit) {
      const poolX = headX + Math.tan(tiltRad) * (tableY - headY) * 0.45;
      const poolGrad = ctx.createRadialGradient(poolX, tableY + 8, 8, poolX, tableY + 8, 170);
      poolGrad.addColorStop(0, `rgba(${r},${g},${b},${0.36 * intensity})`);
      poolGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = poolGrad;
      ctx.fillRect(0, tableY - 2, w, 46);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, tableY);
    ctx.lineTo(w, tableY);
    ctx.stroke();

    // 6. Floating dust motes illuminated inside the beam
    if (isLit) {
      for (const mote of this.dustPool) {
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        if (mote.y < 0.05) {
          mote.y = 0.78;
          mote.x = 0.25 + ((mote.x * 137) % 0.5);
        }
        if (mote.x < 0.1 || mote.x > 0.9) mote.vx *= -1;

        const px = mote.x * w;
        const py = mote.y * h;
        const dist = Math.hypot(px - headX, py - (headY + 80));
        if (dist < 240) {
          const fade = 1 - dist / 240;
          ctx.fillStyle = `rgba(${r},${g},${b},${mote.alpha * fade * intensity})`;
          ctx.beginPath();
          ctx.arc(px, py, mote.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Subtle material tint reflection on shade rim
    const shadeMat = MATERIALS[bp.shadeMaterialId];
    if (isLit && shadeMat.id === 'rattan') {
      ctx.strokeStyle = `rgba(${r},${g},${b},0.06)`;
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX + i * 52, tableY);
        ctx.stroke();
      }
    }
  }

  private drawRoomProps(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    intensity: number,
    r: number,
    g: number,
    b: number
  ): void {
    const tableY = h - 78;
    const propFill = `rgba(${28 + Math.round(r * 0.08 * intensity)}, ${29 + Math.round(g * 0.07 * intensity)}, ${34 + Math.round(b * 0.05 * intensity)}, 0.85)`;
    ctx.fillStyle = propFill;
    ctx.strokeStyle =
      intensity > 0
        ? `rgba(${r},${g},${b},${0.16 * intensity})`
        : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;

    const setting = this.roomSetting();
    if (setting === 'reading_nook' || setting === 'jazz_study') {
      // Left stacked books silhouette on workbench
      ctx.fillRect(w * 0.13, tableY - 22, 62, 22);
      ctx.strokeRect(w * 0.13, tableY - 22, 62, 22);
      ctx.fillRect(w * 0.145, tableY - 38, 48, 16);
      ctx.strokeRect(w * 0.145, tableY - 38, 48, 16);

      // Framed wall art on right
      ctx.strokeRect(w * 0.72, h * 0.18, 86, 108);
      ctx.fillRect(w * 0.72 + 6, h * 0.18 + 6, 74, 96);
    } else if (setting === 'sunroom') {
      // Ceramic planter pot on left
      ctx.beginPath();
      ctx.moveTo(w * 0.14, tableY - 40);
      ctx.lineTo(w * 0.21, tableY - 40);
      ctx.lineTo(w * 0.195, tableY);
      ctx.lineTo(w * 0.155, tableY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Leaves
      ctx.beginPath();
      ctx.ellipse(w * 0.165, tableY - 62, 18, 8, -0.5, 0, Math.PI * 2);
      ctx.ellipse(w * 0.19, tableY - 58, 18, 8, 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (setting === 'drafting_loft') {
      // Drafting triangle & cup on right
      ctx.beginPath();
      ctx.moveTo(w * 0.77, tableY);
      ctx.lineTo(w * 0.85, tableY);
      ctx.lineTo(w * 0.77, tableY - 64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Wine glass / carafe silhouette on right
      ctx.fillRect(w * 0.8, tableY - 42, 16, 42);
      ctx.strokeRect(w * 0.8, tableY - 42, 16, 42);
    }
  }
}
