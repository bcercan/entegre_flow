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
export const ChevronDown = ChevDown;
export const ChevRight = makeIcon(["M9 6l6 6-6 6"]);
export const X = makeIcon(["M18 6 6 18", "M6 6l12 12"]);
export const Dots = makeIcon([{ tag: "circle", attr: { cx: 5, cy: 12, r: 1 } }, { tag: "circle", attr: { cx: 12, cy: 12, r: 1 } }, { tag: "circle", attr: { cx: 19, cy: 12, r: 1 } }]);
export const Bell = makeIcon(["M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"]);
export const Settings = makeIcon([
  "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281z",
  { tag: "circle", attr: { cx: 12, cy: 12, r: 3 } },
]);
export const File = makeIcon(["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"]);
export const Truck = makeIcon(["M1 3h15v13H1z", "M16 8h4l3 3v5h-7", { tag: "circle", attr: { cx: 5.5, cy: 18.5, r: 2 } }, { tag: "circle", attr: { cx: 18.5, cy: 18.5, r: 2 } }]);
export const Shield = makeIcon(["M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6z"]);
export const List = makeIcon(["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"]);
export const Edit = makeIcon(["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"]);
export const Package = makeIcon(["M16 3 8 3 3 8v8l5 5h8l5-5V8z"]);
export const Filter = makeIcon(["M22 3H2l8 9.5V19l4 2v-8.5z"]);

// ---- Outlook chrome icons --------------------------------------------------
export const Mail = makeIcon([{ tag: "rect", attr: { x: 2, y: 4, width: 20, height: 16, rx: 2 } }, "M3 6l9 7 9-7"]);
export const MailOpen = makeIcon(["M3 9l9-6 9 6", "M3 9v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9", "M3 9l9 6 9-6"]);
export const Calendar = makeIcon([{ tag: "rect", attr: { x: 3, y: 5, width: 18, height: 16, rx: 2 } }, "M3 9h18", "M8 3v4", "M16 3v4"]);
export const Users = makeIcon([{ tag: "circle", attr: { cx: 9, cy: 8, r: 3.2 } }, "M3.5 20a5.5 5.5 0 0 1 11 0", "M16 5.2a3.2 3.2 0 0 1 0 6", "M17 15.4a5.5 5.5 0 0 1 3.5 4.6"]);
export const Plus = makeIcon(["M12 5v14", "M5 12h14"]);
export const Menu = makeIcon(["M3 6h18", "M3 12h18", "M3 18h18"]);
export const Flag = makeIcon(["M4 21V4", "M4 4h13l-2 4 2 4H4"]);
export const Pin = makeIcon([
  "M12 17v5",
  "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a3 3 0 0 0-6 0v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z",
]);
export const Move = makeIcon(["M5 8V6a2 2 0 0 1 2-2h3l2 2h7a1 1 0 0 1 1 1v3", "M2 11h11", "M10 8l3 3-3 3", "M4 12v6a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4"]);
export const Folder = makeIcon(["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"]);
export const ReplyAll = makeIcon(["M7 17l-5-5 5-5", "M12 17l-5-5 5-5", "M8 12h9a4 4 0 0 1 4 4v2"]);
export const Block = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 12, r: 9 } }, "M5.6 5.6l12.8 12.8"]);
export const Download = makeIcon(["M12 3v12", "M7 11l5 5 5-5", "M5 21h14"]);
export const Bold = makeIcon(["M7 5h6a3.5 3.5 0 0 1 0 7H7z", "M7 12h7a3.5 3.5 0 0 1 0 7H7z"]);
export const Italic = makeIcon(["M11 5h6", "M7 19h6", "M14 5l-4 14"]);
export const Underline = makeIcon(["M7 4v7a5 5 0 0 0 10 0V4", "M6 20h12"]);
export const ListNumbered = makeIcon(["M10 6h11", "M10 12h11", "M10 18h11", "M4 5h1v4", "M3 9h3", "M3 15h2l-2 3h3"]);
export const Sun = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 12, r: 4 } }, "M12 2v2", "M12 20v2", "M2 12h2", "M20 12h2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M19.1 4.9l-1.4 1.4", "M6.3 17.7l-1.4 1.4"]);
export const Moon = makeIcon(["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"]);
export const Help = makeIcon([{ tag: "circle", attr: { cx: 12, cy: 12, r: 9 } }, "M9.2 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.4-2.6 4", "M12 17h.01"]);
export const ArrowLeft = makeIcon(["M19 12H5", "M12 19l-7-7 7-7"]);
export const MapPin = makeIcon([
  { tag: "circle", attr: { cx: 12, cy: 10, r: 3 } },
  "M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z",
]);
export const ChevUp = makeIcon(["M6 15l6-6 6 6"]);
export const Lock = makeIcon([{ tag: "rect", attr: { x: 3, y: 11, width: 18, height: 11, rx: 2 } }, "M7 11V7a5 5 0 0 1 10 0v4"]);
export const Eye = makeIcon([
  { tag: "circle", attr: { cx: 12, cy: 12, r: 3 } },
  "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z",
]);
export const EyeOff = makeIcon([
  "M9.88 9.88a3 3 0 1 0 4.24 4.24",
  "M10.73 5.08A10.43 10.43 0 0 1 12 5c6.4 0 10 7 10 7a18.25 18.25 0 0 1-3.17 4.5",
  "M6.61 6.61A18.8 18.8 0 0 0 2 12s3.6 7 10 7a9.74 9.74 0 0 0 5.39-1.61",
  "M2 2l20 20",
]);
export const Zap = makeIcon(["M13 2 3 14h9l-1 8 10-12h-9l1-8z"]);
export const LogOut = makeIcon([
  "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
  "M16 17l5-5-5-5",
  "M21 12H9",
]);

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
