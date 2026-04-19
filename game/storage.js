const STORAGE_KEY = "runnerQuestProgressV1";

function sanitizeCompletedLevels(value, maxLevel) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  for (const entry of value) {
    const level = Number(entry);
    if (!Number.isInteger(level)) continue;
    if (level < 1 || level > maxLevel) continue;
    seen.add(level);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

export function loadProgress(maxLevel) {
  const safeMaxLevel = Math.max(1, maxLevel);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        unlockedLevel: 1,
        completedLevels: []
      };
    }

    const parsed = JSON.parse(raw);
    const completedLevels = sanitizeCompletedLevels(parsed?.completedLevels, safeMaxLevel);
    const unlockedLevel = Math.min(
      safeMaxLevel,
      Math.max(1, Number(parsed?.unlockedLevel) || 1)
    );

    return {
      unlockedLevel,
      completedLevels
    };
  } catch (_error) {
    return {
      unlockedLevel: 1,
      completedLevels: []
    };
  }
}

export function saveProgress(progress, maxLevel) {
  const safeMaxLevel = Math.max(1, maxLevel);
  const payload = {
    unlockedLevel: Math.min(safeMaxLevel, Math.max(1, Number(progress.unlockedLevel) || 1)),
    completedLevels: sanitizeCompletedLevels(progress.completedLevels, safeMaxLevel)
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
