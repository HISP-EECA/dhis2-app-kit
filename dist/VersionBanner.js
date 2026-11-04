import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React from "react";
import { useConfig } from "@dhis2/app-runtime";
import { Button, ButtonStrip, NoticeBox } from "@dhis2/ui";
import i18n from "@dhis2/d2-i18n";
import { useApp } from "./context.js";
import { shellIsStale, probeShell, readCacheHeaders, forceFresh } from "./logic/staleshell.js";
function VersionBanner() {
  const app = useApp();
  const { baseUrl } = useConfig();
  const [stale, setStale] = React.useState(false);
  const [probe, setProbe] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    shellIsStale(baseUrl, app.name).then((r) => alive && setStale(!!r.stale));
    return () => {
      alive = false;
    };
  }, [baseUrl, app.name]);
  if (!stale) return null;
  const headers = probe ? readCacheHeaders(probe) : null;
  return /* @__PURE__ */ jsxs(NoticeBox, { warning: true, title: i18n.t("You are running an older version of this app"), children: [
    i18n.t(
      "A newer build is installed on this server, but this tab loaded a cached copy of the old build."
    ),
    /* @__PURE__ */ jsxs(ButtonStrip, { style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsx(Button, { small: true, primary: true, onClick: () => forceFresh(app.name), children: i18n.t("Load the current version") }),
      !probe && /* @__PURE__ */ jsx(Button, { small: true, secondary: true, onClick: async () => setProbe(await probeShell(baseUrl, app.name)), children: i18n.t("Why?") })
    ] }),
    probe && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12, fontSize: 13 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("code", { children: probe.cacheControl || i18n.t("no Cache-Control sent") }),
        probe.age ? /* @__PURE__ */ jsxs(Fragment, { children: [
          " \xB7 ",
          /* @__PURE__ */ jsxs("code", { children: [
            "Age ",
            probe.age
          ] })
        ] }) : null
      ] }),
      headers && /* @__PURE__ */ jsx("div", { style: { marginTop: 4 }, children: headers.text }),
      probe.workers.length > 0 && /* @__PURE__ */ jsx("div", { style: { marginTop: 4 }, children: i18n.t("A service worker is registered for this app and can serve its own copy.") }),
      /* @__PURE__ */ jsx("div", { style: { marginTop: 4, color: "#6e7a8a", overflowWrap: "anywhere" }, children: i18n.t("running {{- running}} \xB7 served {{- serving}}", {
        running: probe.running.join(", ") || "\u2014",
        serving: probe.serving.join(", ") || "\u2014"
      }) })
    ] })
  ] });
}
export {
  VersionBanner as default
};
