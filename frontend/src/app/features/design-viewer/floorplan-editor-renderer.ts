import { BlueprintElement, RoomSpec } from '../../core/models';
import { COLOR_PALETTES } from '../../core/data/design-presets';

/** Render the floorplan elements to a high-res PNG for AI generation */
export async function renderFloorplanPng(
  canvas: HTMLCanvasElement,
  elements: BlueprintElement[],
  spec: RoomSpec,
  iconSvgMap: Map<string, string>,
  selectedPaletteId: string | null,
): Promise<string> {
  const dim = spec.dimensions;
  const ratio = dim.width / dim.length;

  // Fixed high-res output
  const cw = 1600;
  const ch = Math.round(cw / ratio);

  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;

  // Board drawing area (with margins for annotations)
  const margin = 80;
  const boardW = cw - margin * 2;
  const boardH = ch - margin * 2;

  // Scale factor: how many pixels per "editor pixel" (the board in the editor is 600px wide)
  const editorBoardW = 600;
  const editorBoardH = editorBoardW / ratio;
  const scaleX = boardW / editorBoardW;
  const scaleY = boardH / editorBoardH;

  // ── Background ──
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);

  // ── Title ──
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`FLOORPLAN: ${spec.name.toUpperCase()}`, margin, 16);

  ctx.font = '16px Arial, sans-serif';
  ctx.fillStyle = '#444444';
  ctx.fillText(`${dim.width}ft x ${dim.length}ft — ${spec.room_type.replace('_', ' ')}`, margin, 44);

  // ── Grid ──
  ctx.save();
  ctx.translate(margin, margin);

  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 0.5;
  const gridStep = 20 * scaleX;
  for (let x = 0; x <= boardW; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, boardH); ctx.stroke();
  }
  for (let y = 0; y <= boardH; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(boardW, y); ctx.stroke();
  }

  // ── Outer walls ──
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, boardW, boardH);

  // ── Elements ──
  for (const el of elements) {
    const ex = el.x * scaleX;
    const ey = el.y * scaleY;
    const ew = el.w * scaleX;
    const eh = el.h * scaleY;

    ctx.save();

    // Position + rotation
    ctx.translate(ex + ew / 2, ey + eh / 2);
    if (el.r) ctx.rotate((el.r * Math.PI) / 180);
    ctx.translate(-ew / 2, -eh / 2);

    // Type-specific rendering
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    if (el.type === 'wall') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, ew, eh);
    } else if (el.type === 'door') {
      ctx.strokeStyle = '#d93025';
      ctx.fillStyle = '#fce8e6';
      ctx.fillRect(0, 0, ew, eh);
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(0, 0, ew, eh);
      // Draw door arc (quarter circle)
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, eh, Math.min(ew, eh) * 0.8, -Math.PI / 2, 0);
      ctx.strokeStyle = '#d93025';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (el.type === 'window') {
      ctx.strokeStyle = '#0d8c9c';
      ctx.lineWidth = 4;
      ctx.fillStyle = '#e4f7fb';
      ctx.fillRect(0, 0, ew, eh);
      ctx.strokeRect(0, 0, ew, eh);
      // Double line for window
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, eh / 2);
      ctx.lineTo(ew, eh / 2);
      ctx.stroke();
    } else {
      // Furniture
      ctx.fillStyle = '#f0f4ff';
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      ctx.fillRect(0, 0, ew, eh);
      ctx.strokeRect(0, 0, ew, eh);
    }

    // Label
    ctx.fillStyle = el.type === 'wall' ? '#ffffff' : '#000000';
    ctx.font = `bold ${Math.max(10, Math.min(16, ew * 0.12))}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const label = el.label.toUpperCase();
    // Truncate if too long for the element
    const maxLabelW = ew - 8;
    let displayLabel = label;
    if (ctx.measureText(label).width > maxLabelW) {
      while (displayLabel.length > 2 && ctx.measureText(displayLabel + '..').width > maxLabelW) {
        displayLabel = displayLabel.slice(0, -1);
      }
      displayLabel += '..';
    }
    ctx.fillText(displayLabel, ew / 2, eh / 2);

    ctx.restore();
  }

  ctx.restore(); // un-translate from margin

  // ── Dimension Annotations ──
  drawDimensionLine(ctx, margin, ch - 40, margin + boardW, ch - 40, `${dim.width} ft`);
  drawDimensionLine(ctx, 30, margin, 30, margin + boardH, `${dim.length} ft`, true);

  // ── Scale Bar ──
  const scaleBarFt = Math.max(1, Math.floor(dim.width / 6));
  const scaleBarPx = (scaleBarFt / dim.width) * boardW;
  const sbX = cw - margin - scaleBarPx;
  const sbY = ch - 25;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sbX, sbY - 4); ctx.lineTo(sbX, sbY + 4);
  ctx.moveTo(sbX, sbY); ctx.lineTo(sbX + scaleBarPx, sbY);
  ctx.moveTo(sbX + scaleBarPx, sbY - 4); ctx.lineTo(sbX + scaleBarPx, sbY + 4);
  ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${scaleBarFt} ft`, sbX + scaleBarPx / 2, sbY + 6);

  // ── Color Palette Legend ──
  if (selectedPaletteId) {
    const palette = COLOR_PALETTES.find(p => p.id === selectedPaletteId);
    if (palette) {
      const legendX = cw - margin;
      const legendY = 16;
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.fillStyle = '#333';
      ctx.fillText(`Palette: ${palette.name}`, legendX, legendY);
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText(palette.promptKeywords, legendX, legendY + 18);

      // Swatches
      const swatchSize = 18;
      const swatchGap = 4;
      const totalSwatchW = palette.colors.length * (swatchSize + swatchGap) - swatchGap;
      let sx = legendX - totalSwatchW;
      palette.colors.forEach(color => {
        ctx.fillStyle = color;
        ctx.fillRect(sx, legendY + 34, swatchSize, swatchSize);
        ctx.strokeStyle = '#00000022';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, legendY + 34, swatchSize, swatchSize);
        sx += swatchSize + swatchGap;
      });
    }
  }

  // ── Schematic label ──
  ctx.fillStyle = '#999';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCHEMATIC TOP-DOWN FLOORPLAN', cw / 2, ch - 8);

  return canvas.toDataURL('image/png');
}

/** Draw a dimension annotation line with measurement text */
function drawDimensionLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  label: string,
  vertical = false,
) {
  ctx.save();
  ctx.strokeStyle = '#333';
  ctx.fillStyle = '#333';
  ctx.lineWidth = 1;

  // Main line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Tick marks
  const tickLen = 6;
  if (vertical) {
    ctx.beginPath();
    ctx.moveTo(x1 - tickLen, y1); ctx.lineTo(x1 + tickLen, y1);
    ctx.moveTo(x2 - tickLen, y2); ctx.lineTo(x2 + tickLen, y2);
    ctx.stroke();

    // Label (rotated)
    ctx.translate((x1 + x2) / 2, (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, 0, -6);
  } else {
    ctx.beginPath();
    ctx.moveTo(x1, y1 - tickLen); ctx.lineTo(x1, y1 + tickLen);
    ctx.moveTo(x2, y2 - tickLen); ctx.lineTo(x2, y2 + tickLen);
    ctx.stroke();

    // Label
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, (x1 + x2) / 2, y1 + 4);
  }

  ctx.restore();
}
