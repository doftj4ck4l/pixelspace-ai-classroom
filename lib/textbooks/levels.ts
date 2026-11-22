/** Level helpers shared by server and client (no db imports). */

/** "Tahun 4" -> 4, "Tingkatan 4" -> 10 (Standard 1-6 then Form 1-5). */
export const levelOrderFor = (level: string): number | null => {
  const value = level.trim();
  const primary = /^(?:tahun|standard)\s*([1-6])$/i.exec(value);
  if (primary) return Number(primary[1]);
  const secondary = /^(?:tingkatan|form)\s*([1-5])$/i.exec(value);
  if (secondary) return 6 + Number(secondary[1]);
  return null;
};

export const levelLabel = (levelOrder: number): string =>
  levelOrder <= 6 ? `Tahun ${levelOrder}` : `Tingkatan ${levelOrder - 6}`;
