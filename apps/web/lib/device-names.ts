const fallbackFlowerNames = ["aster", "azalea", "daisy", "iris", "lily", "rose", "tulip", "violet", "zinnia"];

function normalizeFlowerName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseFlowerNames(text: string) {
  const names = text
    .split(/\r?\n/)
    .map(normalizeFlowerName)
    .filter(Boolean);
  return names.length > 0 ? names : fallbackFlowerNames;
}

export async function loadFlowerNames() {
  try {
    const response = await fetch("/device-name-flowers.txt");
    if (!response.ok) {
      return fallbackFlowerNames;
    }
    return parseFlowerNames(await response.text());
  } catch {
    return fallbackFlowerNames;
  }
}

function randomFlowerName(flowerNames: string[]) {
  return flowerNames[Math.floor(Math.random() * flowerNames.length)] ?? "aster";
}

export function createDeviceName(flowerNames: string[]) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const first = randomFlowerName(flowerNames);
    const second = randomFlowerName(flowerNames);
    const deviceName = `${first}-${second}`;
    if (deviceName.length <= 32) {
      return deviceName;
    }
  }

  return randomFlowerName(flowerNames);
}

export const defaultFlowerNames = fallbackFlowerNames;
