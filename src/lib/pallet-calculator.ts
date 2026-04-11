import type { ProductRecord } from "@/types/product";

/** Fallback max pallet height when the product doesn't specify one (mm). */
const DEFAULT_MAX_PALLET_HEIGHT_MM = 2000;

// ─── Single-product types ────────────────────────────────────────────────────

export type PalletDetail = {
  pallet_number: number;
  num_pieces: number;
  weight_ton: number;
  dimensions: {
    width_mm: number;
    length_mm: number;
    height_mm: number;
  };
};

export type PalletLayout = {
  product_form: string;
  orientation: string;
  num_pieces: number;
  pieces_per_pallet: number;
  num_pallets: number;
  pallet_dimensions: {
    width_mm: number;
    length_mm: number;
    height_mm: number;
  };
  total_weight_ton: number;
  packaging_code: string | null;
  pallets: PalletDetail[];
};

// ─── Multi-product types ─────────────────────────────────────────────────────

export type PalletLineAllocation = {
  line_index: number;
  product_id: string;
  num_pieces: number;
  weight_ton: number;
};

export type MultiPalletDetail = {
  pallet_number: number;
  orientation: string;
  lines: PalletLineAllocation[];
  total_weight_ton: number;
  dimensions: {
    width_mm: number;
    length_mm: number;
    height_mm: number;
  };
};

export type MultiProductPalletLayout = {
  num_pallets: number;
  total_weight_ton: number;
  pallets: MultiPalletDetail[];
};

// ─── Internal piece representation ───────────────────────────────────────────

/**
 * packing_mode describes how pieces are physically arranged on the pallet
 * (used only for computing output dimensions, NOT for sharing decisions).
 *   "width"  → pieces placed side by side (coils)
 *   "height" → pieces stacked (sheets / strips)
 *
 * Sharing is decided purely by weight:
 *   total_weight_on_pallet ≤ min(max_weight_ton) of all pieces on that pallet.
 */
type Piece = {
  line_index: number;
  product: ProductRecord;
  weight_ton: number;
  /** max weight this pallet type can carry (= product.max_weight) */
  max_weight_ton: number;
  orientation: string;
  packing_mode: "width" | "height";
  /** footprint dimensions used to compute output pallet size */
  footprint_w_mm: number;
  footprint_l_mm: number;
  height_mm: number;
  max_pallet_width: number;
  max_pallet_height: number;
};

function explodeToPieces(
  product: ProductRecord,
  net_weight_ton: number,
  line_index: number
): Piece[] {
  const orientation = product.orientation ?? "H";
  const isCoil = product.external_diameter != null || product.form === "COIL";
  const max_piece_weight_ton = product.max_weight ?? product.min_weight ?? 5;
  const num_pieces = Math.max(1, Math.ceil(net_weight_ton / max_piece_weight_ton));
  const weight_per_piece = net_weight_ton / num_pieces;

  const mat_w = product.width ?? 1200;
  const ext_d = product.external_diameter ?? 1800;
  const max_pw = product.max_pallet_width ?? 1200;
  const max_ph = product.max_pallet_height ?? DEFAULT_MAX_PALLET_HEIGHT_MM;
  const thickness = product.thickness ?? 1;

  let packing_mode: "width" | "height";
  let packing_dim_mm: number;
  let fw: number, fl: number, fh: number;

  if (isCoil) {
    packing_mode = "width";
    if (orientation === "V" || orientation === "EYE") {
      // Ojo horizontal: coil stands like a wheel, placed side by side along width.
      fw = mat_w;
      fl = ext_d;
      fh = ext_d;
    } else {
      // Ojo vertical (H): coil lies flat, placed side by side along diameter.
      fw = ext_d;
      fl = ext_d;
      fh = mat_w;
    }
  } else {
    // Sheet / plate / strip: stacked on top of each other.
    packing_mode = "height";
    fw = mat_w;
    fl = 2440;
    fh = thickness;
  }

  return Array.from({ length: num_pieces }, () => ({
    line_index,
    product,
    weight_ton: weight_per_piece,
    max_weight_ton: max_piece_weight_ton,
    orientation,
    packing_mode,
    footprint_w_mm: fw,
    footprint_l_mm: fl,
    height_mm: fh,
    max_pallet_width: max_pw,
    max_pallet_height: max_ph,
  }));
}

// ─── Single-product layout ───────────────────────────────────────────────────

/**
 * Calculates pallet layout for a single product line.
 */
export function calculatePalletLayout(
  product: ProductRecord,
  net_weight_ton: number
): PalletLayout {
  const pieces = explodeToPieces(product, net_weight_ton, 0);

  if (pieces.length === 0) {
    return {
      product_form: product.form ?? "COIL",
      orientation: product.orientation ?? "H",
      num_pieces: 0,
      pieces_per_pallet: 1,
      num_pallets: 0,
      pallet_dimensions: { width_mm: 0, length_mm: 0, height_mm: 0 },
      total_weight_ton: net_weight_ton,
      packaging_code: product.packaging_code,
      pallets: [],
    };
  }

  const { orientation, packing_mode, footprint_w_mm, footprint_l_mm, height_mm, max_weight_ton } = pieces[0];
  const weight_per_piece = net_weight_ton / pieces.length;

  // Sharing is weight-based: how many pieces fit before exceeding max_weight_ton.
  const pieces_per_pallet = Math.max(1, Math.floor(max_weight_ton / weight_per_piece));

  const num_pallets = Math.ceil(pieces.length / pieces_per_pallet);

  const pallets: PalletDetail[] = [];
  let remaining = pieces.length;

  for (let i = 1; i <= num_pallets; i++) {
    const pcs = Math.min(remaining, pieces_per_pallet);
    remaining -= pcs;
    // Physical dimensions: side-by-side for coils, stacked for sheets.
    const w = packing_mode === "width" ? pcs * footprint_w_mm : footprint_w_mm;
    const h = packing_mode === "height" ? pcs * height_mm : height_mm;
    pallets.push({
      pallet_number: i,
      num_pieces: pcs,
      weight_ton: Number((pcs * weight_per_piece).toFixed(4)),
      dimensions: { width_mm: w, length_mm: footprint_l_mm, height_mm: h },
    });
  }

  const pallet_w = packing_mode === "width" ? pieces_per_pallet * footprint_w_mm : footprint_w_mm;
  const pallet_h = packing_mode === "height" ? pieces_per_pallet * height_mm : height_mm;

  return {
    product_form: product.form ?? "COIL",
    orientation,
    num_pieces: pieces.length,
    pieces_per_pallet,
    num_pallets,
    pallet_dimensions: { width_mm: pallet_w, length_mm: footprint_l_mm, height_mm: pallet_h },
    total_weight_ton: net_weight_ton,
    packaging_code: product.packaging_code,
    pallets,
  };
}

// ─── Multi-product layout ────────────────────────────────────────────────────

/**
 * Calculates pallet layout for multiple product lines.
 *
 * Sharing rules:
 *   - Pieces share a pallet when total_weight ≤ min(max_weight) of pieces on that pallet.
 *   - Coils and sheets never share a pallet.
 *   - Coils with different orientations never share a pallet.
 *   - Pallet dimensions are computed from piece footprints (for display only).
 */
export function calculateMultiProductPalletLayout(
  lines: Array<{ product: ProductRecord; net_weight_ton: number; line_index: number }>
): MultiProductPalletLayout {
  const allPieces: Piece[] = lines.flatMap(({ product, net_weight_ton, line_index }) =>
    explodeToPieces(product, net_weight_ton, line_index)
  );

  if (allPieces.length === 0) {
    return { num_pallets: 0, total_weight_ton: 0, pallets: [] };
  }

  // Group key: coils group by orientation, sheets all together
  const groups = new Map<string, Piece[]>();
  for (const piece of allPieces) {
    const key = piece.packing_mode === "height" ? "sheet" : `coil:${piece.orientation}`;
    const g = groups.get(key) ?? [];
    g.push(piece);
    groups.set(key, g);
  }

  const pallets: MultiPalletDetail[] = [];

  for (const [, group] of groups) {
    let currentBatch: Piece[] = [];
    let usedWeight = 0;
    // Effective capacity = min(max_weight_ton) across all pieces on current pallet.
    let batchCapacity = Infinity;

    for (const piece of group) {
      const effectiveCapacity = Math.min(batchCapacity, piece.max_weight_ton);

      if (currentBatch.length > 0 && usedWeight + piece.weight_ton > effectiveCapacity) {
        pallets.push(buildMultiPallet(pallets.length + 1, currentBatch));
        currentBatch = [];
        usedWeight = 0;
        batchCapacity = Infinity;
      }

      currentBatch.push(piece);
      usedWeight += piece.weight_ton;
      batchCapacity = Math.min(batchCapacity, piece.max_weight_ton);
    }

    if (currentBatch.length > 0) {
      pallets.push(buildMultiPallet(pallets.length + 1, currentBatch));
    }
  }

  const total_weight_ton = lines.reduce((s, l) => s + l.net_weight_ton, 0);
  return { num_pallets: pallets.length, total_weight_ton, pallets };
}

function buildMultiPallet(palletNumber: number, pieces: Piece[]): MultiPalletDetail {
  const allocationMap = new Map<string, PalletLineAllocation>();

  for (const piece of pieces) {
    const key = `${piece.line_index}::${piece.product.id}`;
    const existing = allocationMap.get(key);
    if (existing) {
      existing.num_pieces += 1;
      existing.weight_ton += piece.weight_ton;
    } else {
      allocationMap.set(key, {
        line_index: piece.line_index,
        product_id: piece.product.id,
        num_pieces: 1,
        weight_ton: piece.weight_ton,
      });
    }
  }

  const lineAllocations = Array.from(allocationMap.values()).map((a) => ({
    ...a,
    weight_ton: Number(a.weight_ton.toFixed(4)),
  }));

  const totalWeight = Number(
    lineAllocations.reduce((s, a) => s + a.weight_ton, 0).toFixed(4)
  );

  const mode = pieces[0].packing_mode;
  const orientation = pieces[0].orientation;

  // Pallet dimensions based on packing mode
  let w: number, l: number, h: number;

  if (mode === "width") {
    // Side by side: width = sum of piece footprints, length = max footprint_l, height = max height
    w = pieces.reduce((s, p) => s + p.footprint_w_mm, 0);
    l = Math.max(...pieces.map((p) => p.footprint_l_mm));
    h = Math.max(...pieces.map((p) => p.height_mm));
  } else {
    // Stacked: width = max footprint_w, length = max footprint_l, height = sum of heights
    w = Math.max(...pieces.map((p) => p.footprint_w_mm));
    l = Math.max(...pieces.map((p) => p.footprint_l_mm));
    h = pieces.reduce((s, p) => s + p.height_mm, 0);
  }

  return {
    pallet_number: palletNumber,
    orientation,
    lines: lineAllocations,
    total_weight_ton: totalWeight,
    dimensions: { width_mm: Math.round(w), length_mm: Math.round(l), height_mm: Math.round(h) },
  };
}
