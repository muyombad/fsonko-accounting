// src/services/helpers.js
export const toTitleCase = (str = "") => {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
};

export const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};