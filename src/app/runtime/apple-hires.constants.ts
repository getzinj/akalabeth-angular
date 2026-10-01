export const HIRES_WIDTH: number = 280;
export const HIRES_HEIGHT: number = 192;

/** $2000-$3FFF: seven pixels per byte, bit 0 leftmost, bit 7 the palette bit. */
export const HIRES_BYTES: number = 8192;
export const PIXELS_PER_BYTE: number = 7;
export const BYTES_PER_ROW: number = 40;

export const TEXT_COLUMNS: number = 40;
export const TEXT_ROWS: number = 24;
export const GLYPH_HEIGHT: number = 8;

/** Mixed mode shows four text rows under 160 graphics rows. */
export const MIXED_GRAPHICS_ROWS: number = 160;
export const MIXED_TEXT_TOP: number = 20;

/** HPOSN's base-address arithmetic for a pixel row, as an offset into the screen buffer. */
export function hiresRowOffset(pixelRow: number): number {
  return ((pixelRow & 7) * 0x400) + (((pixelRow >> 3) & 7) * 0x80) + ((pixelRow >> 6) * BYTES_PER_ROW);
}
