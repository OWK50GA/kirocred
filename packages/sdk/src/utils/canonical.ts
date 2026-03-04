// canonical JSON for deterministic attribute hashing
export function canonicalize(obj: Record<string, any>): string {
  const keys = Object.keys(obj).sort();
  const out: Record<string, any> = {};
  for (const k of keys) {
    const v = obj[k];
    // if nested object, canonicalize recursively
    out[k] =
      v && typeof v === "object" && !Array.isArray(v)
        ? canonicalize(v as any)
        : v;
  }
  return JSON.stringify(out);
}
