import { jsx, jsxs } from "react/jsx-runtime";
import React from "react";
import i18n from "@dhis2/d2-i18n";
import { Tabs } from "./ui.js";
import LanguageSelect from "./LanguageSelect.js";
import VersionBanner from "./VersionBanner.js";
import { useApp } from "./context.js";
function AppShell({ chrome = true, tabs, current, onTab, profileLocale, actions, children }) {
  const app = useApp();
  if (!chrome) {
    return /* @__PURE__ */ jsx("div", { style: { fontSize: 14, color: "#212934" }, children });
  }
  return /* @__PURE__ */ jsxs("div", { style: { padding: 24, maxWidth: 1100, fontSize: 14, color: "#212934" }, children: [
    /* @__PURE__ */ jsx(Header, { app, profileLocale, actions }),
    /* @__PURE__ */ jsx(VersionBanner, {}),
    tabs?.length > 1 && /* @__PURE__ */ jsx(Tabs, { tabs, current, onChange: onTab }),
    children,
    /* @__PURE__ */ jsx(Footer, { app })
  ] });
}
function Header({ app, profileLocale, actions }) {
  return /* @__PURE__ */ jsxs(
    "header",
    {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap"
      },
      children: [
        /* @__PURE__ */ jsx("img", { src: app.icon, alt: "", width: 48, height: 48, style: { flex: "none", borderRadius: 4 } }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 220 }, children: [
          /* @__PURE__ */ jsx("h1", { style: { fontSize: 22, fontWeight: 600, margin: 0 }, children: app.title }),
          /* @__PURE__ */ jsx("p", { style: { margin: "2px 0 0", color: "#4a5768" }, children: i18n.t(app.subtitle) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16, flex: "none" }, children: [
          actions,
          /* @__PURE__ */ jsx(LanguageSelect, { profileLocale })
        ] })
      ]
    }
  );
}
function Footer({ app }) {
  return /* @__PURE__ */ jsxs("footer", { style: { marginTop: 40, color: "#6e7a8a", fontSize: 13 }, children: [
    app.title,
    " ",
    app.version,
    " \xB7",
    " ",
    i18n.t("Developed by"),
    " ",
    /* @__PURE__ */ jsx("a", { href: app.org.url, target: "_blank", rel: "noreferrer", style: { color: "#1d5288" }, children: app.org.name }),
    " ",
    "\xB7",
    " ",
    /* @__PURE__ */ jsx("a", { href: app.licenseUrl, target: "_blank", rel: "noreferrer", style: { color: "#1d5288" }, children: app.license })
  ] });
}
export {
  AppShell as default
};
