import { jsx, jsxs } from "react/jsx-runtime";
import React from "react";
import i18n from "@dhis2/d2-i18n";
import { useApp } from "./context.js";
import { resolveLanguage, languageKey } from "./logic/language.js";
function LanguageSelect({ profileLocale }) {
  const app = useApp();
  const shipped = app.locales || [];
  const [lang, setLang] = React.useState(() => {
    let stored = null;
    try {
      stored = window.localStorage.getItem(languageKey(app.name));
    } catch {
    }
    return resolveLanguage({ stored, profile: profileLocale, shipped });
  });
  React.useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);
  function pick(next) {
    setLang(next);
    try {
      window.localStorage.setItem(languageKey(app.name), next);
    } catch {
    }
  }
  if (shipped.length < 2) return null;
  return /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 14 }, children: [
    /* @__PURE__ */ jsx("span", { style: { color: "#4a5768" }, children: i18n.t("Language") }),
    /* @__PURE__ */ jsx(
      "select",
      {
        value: lang,
        onChange: (e) => pick(e.target.value),
        style: {
          font: "inherit",
          padding: "4px 6px",
          border: "1px solid #a0aab8",
          borderRadius: 3,
          background: "#fff"
        },
        children: shipped.map((l) => /* @__PURE__ */ jsx("option", { value: l.code, children: l.label }, l.code))
      }
    )
  ] });
}
export {
  LanguageSelect as default
};
