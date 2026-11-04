import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React from "react";
import i18n from "@dhis2/d2-i18n";
function Hint({ children, style }) {
  if (!children) return null;
  return /* @__PURE__ */ jsx("p", { style: { margin: "0 0 8px", color: "#4a5768", ...style }, children });
}
function Step({ title, lead, children }) {
  return /* @__PURE__ */ jsxs("section", { style: { marginTop: 4 }, children: [
    /* @__PURE__ */ jsx("h2", { style: { fontSize: 20, fontWeight: 600, margin: "0 0 4px" }, children: title }),
    /* @__PURE__ */ jsx(Hint, { style: { margin: "0 0 16px" }, children: lead }),
    children
  ] });
}
function Section({ title, lead, children, style }) {
  return /* @__PURE__ */ jsxs("section", { style: { marginTop: 24, ...style }, children: [
    /* @__PURE__ */ jsx("h3", { style: { fontSize: 15, fontWeight: 600, margin: "0 0 4px" }, children: title }),
    /* @__PURE__ */ jsx(Hint, { children: lead }),
    children
  ] });
}
function Steps({ steps, current }) {
  return /* @__PURE__ */ jsx("nav", { style: { margin: "4px 0 20px", color: "#6e7a8a", fontSize: 14 }, children: steps.map(([key, label], i) => /* @__PURE__ */ jsxs("span", { children: [
    i > 0 && /* @__PURE__ */ jsx("span", { style: { margin: "0 6px" }, children: "\u203A" }),
    /* @__PURE__ */ jsx("strong", { style: { color: key === current ? "#1d2c3b" : void 0, fontWeight: key === current ? 600 : 400 }, children: i18n.t(label) })
  ] }, key)) });
}
function SectionTitle({ children }) {
  return /* @__PURE__ */ jsx("h3", { style: { fontSize: 15, fontWeight: 600, margin: "0 0 4px" }, children });
}
import { Checkbox, CircularLoader } from "@dhis2/ui";
const RULE = "1px solid #e8edf2";
function TypeTag({ children }) {
  if (!children) return null;
  return /* @__PURE__ */ jsx(
    "code",
    {
      style: {
        background: "#f3f5f7",
        borderRadius: 3,
        padding: "1px 6px",
        fontSize: 12,
        color: "#4a5768",
        flex: "none"
      },
      children
    }
  );
}
function Collapsible({
  tag,
  label,
  note,
  count,
  checked,
  indeterminate,
  onCheck,
  onToggle,
  open,
  children
}) {
  return /* @__PURE__ */ jsxs("details", { open, onToggle, style: { borderBottom: RULE }, children: [
    /* @__PURE__ */ jsxs(
      "summary",
      {
        style: {
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 4px"
        },
        children: [
          onCheck && // Stops the click reaching the summary: ticking a group is not
          // the same gesture as opening it, and a tick that also expanded
          // ninety rows would be its own small betrayal.
          /* @__PURE__ */ jsx(
            "span",
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                onCheck(!checked);
              },
              style: { display: "flex", flex: "none" },
              children: /* @__PURE__ */ jsx(Checkbox, { dense: true, checked: !!checked, indeterminate: !!indeterminate, onChange: () => {
              } })
            }
          ),
          /* @__PURE__ */ jsx(TypeTag, { children: tag }),
          label && /* @__PURE__ */ jsx("strong", { style: { overflowWrap: "anywhere" }, children: label }),
          note && /* @__PURE__ */ jsx("span", { style: { color: "#6e7a8a" }, children: note }),
          /* @__PURE__ */ jsx("span", { style: { flex: 1 } }),
          count !== void 0 && count !== null && /* @__PURE__ */ jsx("span", { style: { color: "#6e7a8a", fontVariantNumeric: "tabular-nums", flex: "none" }, children: count })
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { style: { padding: "4px 0 12px 16px" }, children })
  ] });
}
function ItemRow({ tag, label, uid, meta, checked, onCheck, disabled, action }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "5px 4px",
        borderBottom: RULE
      },
      children: [
        onCheck && /* @__PURE__ */ jsx("span", { style: { flex: "none", paddingTop: 1 }, children: /* @__PURE__ */ jsx(
          Checkbox,
          {
            dense: true,
            checked: !!checked,
            disabled,
            onChange: ({ checked: c }) => onCheck(c)
          }
        ) }),
        /* @__PURE__ */ jsx(TypeTag, { children: tag }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsx("span", { style: { overflowWrap: "anywhere" }, children: label }),
          uid && /* @__PURE__ */ jsx("code", { style: { color: "#6e7a8a", marginLeft: 6 }, children: uid }),
          meta && /* @__PURE__ */ jsx("div", { style: { color: "#6e7a8a", fontSize: 13, marginTop: 1, overflowWrap: "anywhere" }, children: meta })
        ] }),
        action && /* @__PURE__ */ jsx("span", { style: { flex: "none", whiteSpace: "nowrap" }, children: action })
      ]
    }
  );
}
const ACTION_CELL = { whiteSpace: "nowrap", width: 1 };
function useProgress() {
  const [stage, setStage] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [lines, setLines] = React.useState([]);
  const say = React.useCallback((next, d = null) => {
    setStage(next);
    setDetail(next ? d : null);
    setLines([]);
  }, []);
  const step = React.useCallback(({ stage: st, detail: d, step: i, steps, done, total }) => {
    setStage(st || i18n.t("Working\u2026"));
    setDetail(steps ? i18n.t("step {{i}}/{{steps}}", { i: Math.min(i, steps), steps }) : null);
    setLines((ls) => {
      const key = `${st}|${i}`;
      const last = ls[ls.length - 1];
      if (last && last.key === key) {
        return [...ls.slice(0, -1), { ...last, detail: d, done, total }];
      }
      const settled = ls.map((l) => l.state === "running" ? { ...l, state: "done" } : l);
      const head = last && last.stage === st ? [] : [{ key: `${st}|head`, stage: st, head: true }];
      const next = [...settled, ...head, { key, stage: st, detail: d, done, total, state: "running" }];
      return next.length > 120 ? next.slice(next.length - 120) : next;
    });
  }, []);
  return { stage, detail, lines, busy: !!stage, say, step };
}
function ProgressLog({ lines }) {
  const box = React.useRef(null);
  const last = lines?.[lines.length - 1];
  React.useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [last?.key, lines?.length]);
  if (!lines?.length) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: box,
      style: {
        marginTop: 16,
        maxWidth: 560,
        height: "calc(100vh - 200px)",
        minHeight: 240,
        overflowY: "auto",
        fontSize: 13,
        lineHeight: 1.7,
        borderLeft: "2px solid #e8edf2",
        paddingLeft: 12
      },
      children: lines.map(
        (l) => l.head ? /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, marginTop: 10, color: "#212934" }, children: l.stage }, l.key) : /* @__PURE__ */ jsxs(
          "div",
          {
            style: { display: "flex", gap: 8, color: l.state === "done" ? "#6e7a8a" : "#212934" },
            children: [
              /* @__PURE__ */ jsx("span", { style: { width: 14, flex: "none" }, children: l.state === "done" ? "\u2713" : "\xB7" }),
              /* @__PURE__ */ jsx("span", { style: { flex: 1, minWidth: 0, overflowWrap: "anywhere" }, children: l.detail }),
              /* @__PURE__ */ jsx("span", { style: { flex: "none", fontVariantNumeric: "tabular-nums" }, children: l.state === "done" ? i18n.t("ok") : l.total ? `${l.done.toLocaleString()} / ${l.total.toLocaleString()}` : l.done ? l.done.toLocaleString() : "" })
            ]
          },
          l.key
        )
      )
    }
  );
}
function BusyScreen({ stage, detail, lines }) {
  return /* @__PURE__ */ jsxs("div", { style: { padding: 24 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 14, alignItems: "flex-start" }, children: [
      /* @__PURE__ */ jsx(CircularLoader, { small: true }),
      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 500 }, children: stage }),
        detail ? /* @__PURE__ */ jsx("div", { style: { color: "#6e7a8a", fontSize: 13, marginTop: 4, overflowWrap: "anywhere" }, children: detail }) : null
      ] })
    ] }),
    /* @__PURE__ */ jsx(ProgressLog, { lines })
  ] });
}
function Card({ step, title, children, style }) {
  return /* @__PURE__ */ jsxs(
    "section",
    {
      style: {
        border: `1px solid ${RULE}`,
        borderRadius: 4,
        background: "#fff",
        padding: 20,
        marginTop: 16,
        ...style
      },
      children: [
        title && /* @__PURE__ */ jsxs("h3", { style: { fontSize: 15, fontWeight: 600, margin: "0 0 8px" }, children: [
          step ? `${step}. ` : "",
          title
        ] }),
        children
      ]
    }
  );
}
function Tabs({ tabs, current, onChange }) {
  return /* @__PURE__ */ jsx("nav", { style: { display: "flex", gap: 24, borderBottom: `1px solid ${RULE}`, margin: "0 0 20px" }, children: tabs.map(([key, label]) => {
    const on = key === current;
    return /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => onChange(key),
        style: {
          appearance: "none",
          background: "none",
          border: "none",
          borderBottom: `2px solid ${on ? "#1d5288" : "transparent"}`,
          color: on ? "#1d5288" : "#4a5768",
          cursor: "pointer",
          fontSize: 15,
          fontWeight: on ? 600 : 400,
          padding: "10px 2px",
          marginBottom: -1
        },
        children: label
      },
      key
    );
  }) });
}
function TextAction({ onClick, disabled, children }) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      style: {
        appearance: "none",
        background: "none",
        border: "none",
        padding: 0,
        font: "inherit",
        color: disabled ? "#a0aab8" : "#1d5288",
        cursor: disabled ? "default" : "pointer",
        textDecoration: "underline"
      },
      children
    }
  );
}
function SelectionBar({ selected, total, onSelectShown, onClearAll, onlySelected, onOnlySelected }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        color: "#6e7a8a",
        fontSize: 13,
        margin: "6px 0"
      },
      children: [
        /* @__PURE__ */ jsx("span", { children: i18n.t("Selected {{selected}} of {{total}}", { selected, total }) }),
        onSelectShown && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { children: "\xB7" }),
          /* @__PURE__ */ jsx(TextAction, { onClick: onSelectShown, children: i18n.t("select shown") })
        ] }),
        onClearAll && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { children: "\xB7" }),
          /* @__PURE__ */ jsx(TextAction, { onClick: onClearAll, disabled: !selected, children: i18n.t("clear all") })
        ] }),
        onOnlySelected && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { children: "\xB7" }),
          /* @__PURE__ */ jsx("span", { style: { display: "flex", alignItems: "center" }, children: /* @__PURE__ */ jsx(
            Checkbox,
            {
              dense: true,
              checked: !!onlySelected,
              label: i18n.t("only selected"),
              onChange: ({ checked }) => onOnlySelected(checked)
            }
          ) })
        ] })
      ]
    }
  );
}
function LogPanel({ lines, height = 300 }) {
  const box = React.useRef(null);
  React.useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines?.length]);
  return /* @__PURE__ */ jsx(
    "pre",
    {
      ref: box,
      style: {
        background: "#1e2832",
        color: "#d6dde6",
        borderRadius: 4,
        padding: 12,
        height,
        overflowY: "auto",
        fontSize: 12,
        lineHeight: 1.6,
        margin: 0,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere"
      },
      children: (lines || []).join("\n")
    }
  );
}
export {
  ACTION_CELL,
  BusyScreen,
  Card,
  Collapsible,
  Hint,
  ItemRow,
  LogPanel,
  ProgressLog,
  Section,
  SectionTitle,
  SelectionBar,
  Step,
  Steps,
  Tabs,
  TextAction,
  useProgress
};
