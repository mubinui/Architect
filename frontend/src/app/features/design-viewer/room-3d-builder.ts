import * as THREE from 'three';
import { BlueprintElement, Dimensions } from '../../core/models/room.model';
import { CatalogItem } from '../../core/models/catalog.model';

const BOARD_WIDTH_PX = 600;
const FOOT_IN_METERS = 0.3048;
const DEFAULT_CEILING_FT = 9;

const STRUCTURAL_TYPES = new Set(['wall', 'door', 'window']);

interface BuildInput {
  elements: BlueprintElement[];
  dimensions: Dimensions;
  catalogItems?: CatalogItem[];
  furnitureImages?: Map<string, string>;
}

export interface BuildResult {
  group: THREE.Group;
  roomCenter: THREE.Vector3;
  roomSizeM: { width: number; length: number; height: number };
  disposables: Array<{ dispose: () => void }>;
}

export function buildRoomScene(input: BuildInput): BuildResult {
  const { elements, dimensions, furnitureImages } = input;

  const roomW = dimensions.width || 10;
  const roomL = dimensions.length || 10;
  const roomH = dimensions.height || DEFAULT_CEILING_FT;

  const ftPerPx = roomW / BOARD_WIDTH_PX;
  const boardHeightPx = BOARD_WIDTH_PX * (roomL / roomW);

  const widthM = roomW * FOOT_IN_METERS;
  const lengthM = roomL * FOOT_IN_METERS;
  const heightM = roomH * FOOT_IN_METERS;

  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  // ── Floor ──
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xe8e4db,
    roughness: 0.9,
    metalness: 0,
  });
  const floorGeo = new THREE.PlaneGeometry(widthM, lengthM);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  disposables.push(floorGeo, floorMat);

  // Floor grid for scale
  const grid = new THREE.GridHelper(
    Math.max(widthM, lengthM) * 1.1,
    Math.round(Math.max(roomW, roomL)),
    0xbfbfbf,
    0xe4e4e4
  );
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.45;
  grid.position.y = 0.001;
  group.add(grid);
  disposables.push(grid.geometry, grid.material as THREE.Material);

  // ── Perimeter walls (always rendered as the room shell) ──
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  disposables.push(shellMat);
  const wallThickness = 0.1;

  const perimeter: Array<[number, number, number, number]> = [
    [widthM, wallThickness, 0, -lengthM / 2],
    [widthM, wallThickness, 0, lengthM / 2],
    [wallThickness, lengthM, -widthM / 2, 0],
    [wallThickness, lengthM, widthM / 2, 0],
  ];
  for (const [w, d, x, z] of perimeter) {
    const geo = new THREE.BoxGeometry(w, heightM, d);
    const mesh = new THREE.Mesh(geo, shellMat);
    mesh.position.set(x, heightM / 2, z);
    group.add(mesh);
    disposables.push(geo);
  }

  // ── Element conversion helpers ──
  const toWorldX = (pxX: number, pxW: number) =>
    ((pxX + pxW / 2) * ftPerPx - roomW / 2) * FOOT_IN_METERS;
  const toWorldZ = (pxY: number, pxH: number) =>
    ((pxY + pxH / 2) * ftPerPx - roomL / 2) * FOOT_IN_METERS;
  const sizeFt = (px: number) => px * ftPerPx;
  const sizeM = (px: number) => sizeFt(px) * FOOT_IN_METERS;

  // Materials for user-drawn structural elements
  const userWallMat = new THREE.MeshStandardMaterial({ color: 0xd7cfbe, roughness: 0.95 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.75 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x9fd6ff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.2,
  });
  disposables.push(userWallMat, doorMat, windowMat);

  const labelDisposables: Array<{ dispose: () => void }> = [];

  for (const el of elements) {
    const x = toWorldX(el.x, el.w);
    const z = toWorldZ(el.y, el.h);
    const w = Math.max(0.05, sizeM(el.w));
    const d = Math.max(0.05, sizeM(el.h));
    const rot = ((el.r ?? 0) * Math.PI) / 180;

    if (el.type === 'wall') {
      const geo = new THREE.BoxGeometry(w, heightM, d);
      const mesh = new THREE.Mesh(geo, userWallMat);
      mesh.position.set(x, heightM / 2, z);
      mesh.rotation.y = -rot;
      group.add(mesh);
      disposables.push(geo);
      continue;
    }

    if (el.type === 'door') {
      const doorH = Math.min(heightM * 0.85, 2.13); // ~7 ft
      const geo = new THREE.BoxGeometry(w, doorH, Math.max(d, 0.08));
      const mesh = new THREE.Mesh(geo, doorMat);
      mesh.position.set(x, doorH / 2, z);
      mesh.rotation.y = -rot;
      group.add(mesh);
      disposables.push(geo);
      continue;
    }

    if (el.type === 'window') {
      const winH = Math.min(heightM * 0.45, 1.4);
      const sillH = heightM * 0.35;
      const geo = new THREE.BoxGeometry(w, winH, Math.max(d, 0.06));
      const mesh = new THREE.Mesh(geo, windowMat);
      mesh.position.set(x, sillH + winH / 2, z);
      mesh.rotation.y = -rot;
      group.add(mesh);
      disposables.push(geo);
      continue;
    }

    // Furniture — solid box sized to the 2D footprint.
    const furnHeightM = estimateFurnitureHeightM(el.type);
    const geo = new THREE.BoxGeometry(w, furnHeightM, d);

    const textureUrl = furnitureImages?.get(el.type) ?? furnitureImages?.get(el.id);
    const { materials, textures } = buildFurnitureMaterials(el, textureUrl);
    for (const t of textures) disposables.push(t);
    for (const m of materials) disposables.push(m);

    const mesh = new THREE.Mesh(geo, materials);
    mesh.position.set(x, furnHeightM / 2, z);
    mesh.rotation.y = -rot;
    group.add(mesh);
    disposables.push(geo);

    const label = makeTextSprite(el.label || prettify(el.type));
    if (label) {
      label.position.set(x, furnHeightM + 0.25, z);
      group.add(label);
      labelDisposables.push(label.material as THREE.Material);
      const map = (label.material as THREE.SpriteMaterial).map;
      if (map) labelDisposables.push(map);
    }
  }

  disposables.push(...labelDisposables);

  return {
    group,
    roomCenter: new THREE.Vector3(0, heightM / 2, 0),
    roomSizeM: { width: widthM, length: lengthM, height: heightM },
    disposables,
  };
}

// ── Helpers ──

function estimateFurnitureHeightM(type: string): number {
  const ft: Record<string, number> = {
    king_bed: 2.0,
    queen_bed: 2.0,
    nightstand: 2.0,
    dresser: 3.0,
    wardrobe: 6.5,
    desk: 2.5,
    chair: 3.0,
    mirror: 5.0,
    rug: 0.05,
    floor_lamp: 5.0,
    bookshelf: 6.0,
    plants: 3.5,
    sofa: 2.8,
    coffee_table: 1.4,
    tv_unit: 2.0,
    armchair: 3.0,
    side_table: 2.0,
    curtains: 7.5,
    dining_table: 2.5,
    dining_chairs: 3.0,
    kitchen_island: 3.0,
    bar_stools: 2.8,
    pantry_shelf: 6.0,
    pendant_lights: 1.5,
    bathtub: 2.0,
    vanity: 2.8,
    mirror_large: 3.5,
    towel_rack: 1.5,
    shower_glass: 6.5,
    office_chair: 3.2,
    monitor: 1.5,
    desk_lamp: 1.5,
    filing_cabinet: 3.8,
    buffet: 3.0,
    chandelier: 1.5,
  };
  const base = ft[type] ?? 2.5;
  return base * FOOT_IN_METERS;
}

function buildFurnitureMaterials(
  el: BlueprintElement,
  textureUrl: string | undefined
): { materials: THREE.Material[]; textures: THREE.Texture[] } {
  const baseColor = colorForType(el.type);
  const sideMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.75 });

  const textures: THREE.Texture[] = [];
  let topMat: THREE.MeshStandardMaterial = sideMat;

  if (textureUrl) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const tex = loader.load(textureUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    textures.push(tex);
    topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  }

  // BoxGeometry material order: [+X, -X, +Y, -Y, +Z, -Z]
  const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
  const uniqueMats: THREE.Material[] = [sideMat];
  if (topMat !== sideMat) uniqueMats.push(topMat);
  return { materials, textures };
}

function colorForType(type: string): number {
  if (type.includes('bed') || type === 'sofa' || type === 'armchair') return 0xd9b38c;
  if (type.includes('table') || type === 'desk' || type === 'buffet' || type === 'nightstand') return 0xa67b5b;
  if (type.includes('chair') || type === 'bar_stools') return 0x967259;
  if (type === 'rug') return 0xc49b7a;
  if (type === 'wardrobe' || type === 'bookshelf' || type === 'filing_cabinet' || type === 'tv_unit' || type === 'pantry_shelf' || type === 'dresser') return 0x8b6b4a;
  if (type === 'bathtub' || type === 'vanity' || type === 'shower_glass' || type === 'mirror_large' || type === 'mirror' || type === 'towel_rack') return 0xe9eef1;
  if (type.includes('lamp') || type === 'pendant_lights' || type === 'chandelier' || type === 'monitor') return 0xcfd8dc;
  if (type === 'plants') return 0x4e7a4a;
  if (type === 'curtains') return 0xe6d7c3;
  return 0xb5a48c;
}

function prettify(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function makeTextSprite(text: string): THREE.Sprite | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const font = 'bold 48px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const padX = 24;
  const padY = 16;
  const w = Math.ceil(metrics.width) + padX * 2;
  const h = 64 + padY * 2;
  canvas.width = w;
  canvas.height = h;

  ctx.font = font;
  ctx.fillStyle = 'rgba(32, 33, 36, 0.85)';
  roundRect(ctx, 0, 0, w, h, 16);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  const aspect = w / h;
  const worldH = 0.32;
  sprite.scale.set(worldH * aspect, worldH, 1);
  return sprite;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
