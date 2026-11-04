function resolveLanguage({ stored, profile, shipped }) {
  const has = (c) => (shipped || []).some((l) => l.code === c);
  if (stored && has(stored)) return stored;
  if (profile && has(profile)) return profile;
  const base = String(profile || "").split(/[-_]/)[0];
  if (base && has(base)) return base;
  return shipped?.[0]?.code || "en";
}
const languageKey = (appName) => `${appName}.lang`;
export {
  languageKey,
  resolveLanguage
};
