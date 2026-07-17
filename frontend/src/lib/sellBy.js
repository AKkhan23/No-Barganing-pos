const WEIGHT_UNITS = new Set([
  "kg", "kilogram", "kilograms",
  "g", "gram", "grams",
  "ml", "milliliter", "milliliters",
  "l", "liter", "liters", "litre", "litres",
  "mg", "milligram", "milligrams",
]);

export function isWeightUnit(val) {
  if (!val) return false;
  return WEIGHT_UNITS.has(val.toLowerCase().trim());
}

export function formatQty(qty, unit) {
  const u = (unit || "").toLowerCase().trim();
  const n = Number(qty) || 0;
  if (u === "kg" || u === "kilogram" || u === "kilograms") {
    if (n < 1) return Math.round(n * 1000) + " g";
    return Number(n.toFixed(3)) + " kg";
  }
  if (u === "l" || u === "liter" || u === "liters" || u === "litre" || u === "litres") {
    if (n < 1) return Math.round(n * 1000) + " ml";
    return Number(n.toFixed(3)) + " L";
  }
  if (u === "g" || u === "gram" || u === "grams") return Math.round(n) + " g";
  if (u === "ml" || u === "milliliter" || u === "milliliters") return Math.round(n) + " ml";
  if (u === "mg" || u === "milligram" || u === "milligrams") return Math.round(n) + " mg";
  return String(n);
}

export function formatStock(stock, sellBy) {
  if (!sellBy) return String(Math.round(stock * 1000) / 1000);
  if (isWeightUnit(sellBy)) return formatQty(stock, sellBy);
  return String(Math.round(stock * 1000) / 1000);
}

const MAIN_SUB_UNITS = { kg: "g", kilogram: "g", kilograms: "g", l: "ml", liter: "ml", liters: "ml", litre: "ml", litres: "ml" };

export function hasSubUnit(unit) {
  return !!MAIN_SUB_UNITS[(unit || "").toLowerCase().trim()];
}

export function getSubUnit(unit) {
  return MAIN_SUB_UNITS[(unit || "").toLowerCase().trim()] || null;
}

export function getDisplayUnit(unit) {
  const u = (unit || "").toLowerCase().trim();
  if (u === "kg" || u === "kilogram" || u === "kilograms") return "kg";
  if (u === "l" || u === "liter" || u === "liters" || u === "litre" || u === "litres") return "L";
  if (u === "g" || u === "gram" || u === "grams") return "g";
  if (u === "ml" || u === "milliliter" || u === "milliliters") return "ml";
  if (u === "mg" || u === "milligram" || u === "milligrams") return "mg";
  return unit;
}

export function isKgUnit(unit) {
  const u = (unit || "").toLowerCase().trim();
  return u === "kg" || u === "kilogram" || u === "kilograms";
}
