/**
 * The design canvas' one-liner hash, kept verbatim (ADR 45). Three designs in
 * the third sheet scatter things — stars, a waveform, confetti — and a scatter
 * has to be **the same scatter on every render**: `Math.random()` would move the
 * stars every frame and break ADR 07's purity rule outright.
 *
 * Not a `.tsx`, so it is not a design module and the registry's completeness
 * test does not count it.
 */
export function hash01(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
