import { createElement, type CSSProperties, type FC } from "react";

/**
 * Minimal line-icon set ported verbatim from the prototype's icons.jsx (feather/
 * lucide style). Kept in-repo to preserve the exact prototype look, incl. the
 * bespoke KKD/PPE product glyphs (helmet/glove/boot/…).
 */
export interface IconProps {
  size?: number;
  sw?: number;
  className?: string;
  style?: CSSProperties;
  color?: string;
}

type Node = string | { tag: "circle" | "rect" | "ellipse" | "path"; attr: Record<string, string | number> };

function makeIcon(nodes: Node[]): FC<IconProps> {
  const Icon: FC<IconProps> = ({ size = 18, sw = 1.7, className, style, color }) =>
    createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color ?? "currentColor",
        strokeWidth: sw,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className,
        style,
      },
      nodes.map((d, i) =>
        typeof d === "string"
          ? createElement("path", { key: i, d })
          : createElement(d.tag, { key: i, ...d.attr }),
      ),
    );
  return Icon;
}

export const Inbox = makeIcon(["M22 12h-6l-2 3h-4l-2-3H2", "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]);
export const Sparkle = makeIcon(["M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.4l-1.9-4.8L5.3 9.7l4.8-1.9z", "M19 15l.8 2 .2.8 2 .2-2 .8-.2 2-.8-2-2-.2 2-.2.8-2z"]);
export const Send = makeIcon(["M22 2 11 13", "M22 2 15 22l-4-9-9-4z"]);
export const Search = makeIcon([{ tag: "circle", attr: { cx: 11, cy: 11, r: 7 } }, "M21 21l-4.3-4.3"]);
export const Clock = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 12, r: 9 } }, "M12 7v5l3 2"]);
export const Check = makeIcon(["M20 6 9 17l-5-5"]);
export const CheckCircle = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 12, r: 9 } }, "M8.5 12.5 11 15l4.5-5"]);
export const Alert = makeIcon(["M12 9v4", "M12 17h.01", "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"]);
export const Info = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 12, r: 9 } }, "M12 11v5", "M12 8h.01"]);
export const Reply = makeIcon(["M9 17l-5-5 5-5", "M4 12h11a5 5 0 0 1 5 5v2"]);
export const Forward = makeIcon(["M15 17l5-5-5-5", "M20 12H9a5 5 0 0 0-5 5v2"]);
export const Archive = makeIcon([{ tag: "rect", attr: { x: 3, y: 4, width: 18, height: 4, rx: 1 } }, "M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8", "M10 12h4"]);
export const Trash = makeIcon(["M3 6h18", "M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2", "M6 6v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"]);
export const Star = makeIcon(["M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.5 6.8 19l1-5.8L3.6 9.1l5.8-.8z"]);
export const Pen = makeIcon(["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"]);
export const Copy = makeIcon([{ tag: "rect", attr: { x: 9, y: 9, width: 12, height: 12, rx: 2 } }, "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"]);
export const Refresh = makeIcon(["M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5"]);
export const Box = makeIcon(["M21 8 12 3 3 8l9 5 9-5z", "M3 8v8l9 5 9-5V8", "M12 13v8"]);
export const Database = makeIcon([{ tag: "ellipse", attr: { cx: 12, cy: 5, rx: 8, ry: 3 } }, "M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5", "M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"]);
export const User = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 8, r: 4 } }, "M4 21a8 8 0 0 1 16 0"]);
export const Wallet = makeIcon(["M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2", "M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3", "M21 10v4h-4a2 2 0 0 1 0-4z"]);
export const History = makeIcon(["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 8v4l3 2"]);
export const Tag = makeIcon(["M20.6 13.4 12 22l-9-9V3h10l8.6 8.6a2 2 0 0 1 0 2.8z", { tag: "circle", attr: { cx: 7.5, cy: 7.5, r: 1.3 } }]);
export const ChevDown = makeIcon(["M6 9l6 6 6-6"]);
export const ChevRight = makeIcon(["M9 6l6 6-6 6"]);
export const X = makeIcon(["M18 6 6 18", "M6 6l12 12"]);
export const Dots = makeIcon([{ tag: "circle", attr: { cx: 5, cy: 12, r: 1 } }, { tag: "circle", attr: { cx: 12, cy: 12, r: 1 } }, { tag: "circle", attr: { cx: 19, cy: 12, r: 1 } }]);
export const Bell = makeIcon(["M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"]);
export const Settings = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 12, r: 3 } }, "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 12 4.6h0A1.65 1.65 0 0 0 13 3.5V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 12.5h0a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"]);
export const File = makeIcon(["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"]);
export const Truck = makeIcon(["M1 3h15v13H1z", "M16 8h4l3 3v5h-7", { tag: "circle", attr: { cx: 5.5, cy: 18.5, r: 2 } }, { tag: "circle", attr: { cx: 18.5, cy: 18.5, r: 2 } }]);
export const Shield = makeIcon(["M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6z"]);
export const List = makeIcon(["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"]);
export const Edit = makeIcon(["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"]);
export const Package = makeIcon(["M16 3 8 3 3 8v8l5 5h8l5-5V8z"]);
export const Filter = makeIcon(["M22 3H2l8 9.5V19l4 2v-8.5z"]);

// ---- bespoke KKD/PPE product glyphs ----------------------------------------
export const helmet = makeIcon(["M4 14a8 8 0 0 1 16 0", "M3 14h18v2H3z", "M12 6v0", "M9 7.2A4 4 0 0 1 15 7.2"]);
export const glove = makeIcon(["M8 11V6a1.5 1.5 0 0 1 3 0v4", "M11 10V5a1.5 1.5 0 0 1 3 0v5", "M14 10V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6H9a4 4 0 0 1-4-4 2 2 0 0 1 3.5-1.3"]);
export const boot = makeIcon(["M7 3v9l-3 2v5h16v-2a4 4 0 0 0-4-4l-4-2V3z", "M4 17h16"]);
export const vest = makeIcon(["M8 3 4 6v14h16V6l-4-3", "M8 3l4 4 4-4", "M12 7v13"]);
export const mask = makeIcon(["M3 9a9 4 0 0 1 18 0v3a9 6 0 0 1-18 0z", "M3 11h18"]);
export const ear = makeIcon(["M6 20a4 4 0 0 0 4-4c0-2 4-2 4-6a4 4 0 0 0-8 0", "M18 4a4 4 0 0 1 0 8"]);
export const glasses = makeIcon([{ tag: "circle", attr: { cx: 6, cy: 14, r: 3 } }, { tag: "circle", attr: { cx: 18, cy: 14, r: 3 } }, "M9 13l6 0", "M3 11l2-3h3", "M21 11l-2-3h-3"]);
export const harness = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 5, r: 2 } }, "M8 9h8l-1 5H9z", "M9 14l-1 7M15 14l1 7", "M8 9 6 7M16 9l2-2"]);

/** Icon lookup by key (for dynamic product icons from catalog attributes). */
export const iconByKey: Record<string, FC<IconProps>> = {
  helmet, glove, boot, vest, mask, ear, glasses, harness,
  box: Box,
};
