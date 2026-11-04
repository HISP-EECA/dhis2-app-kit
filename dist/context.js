import { jsx } from "react/jsx-runtime";
import React from "react";
const Ctx = React.createContext(null);
function AppKitProvider({ app, children }) {
  const value = React.useMemo(
    () => ({
      license: "BSD-3-Clause",
      org: { name: "HISP EECA", url: "https://hispeeca.org/" },
      locales: [{ code: "en", label: "English" }],
      ...app
    }),
    [app]
  );
  return /* @__PURE__ */ jsx(Ctx.Provider, { value, children });
}
function useApp() {
  const v = React.useContext(Ctx);
  if (!v) {
    throw new Error("Wrap the app in <AppKitProvider app={\u2026}> \u2014 see @hisp-eeca/dhis2-app-kit");
  }
  return v;
}
export {
  AppKitProvider,
  useApp
};
