import { ImageResponse } from "next/og";

export const alt = "InboxKnock. Knock before you send.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0c0d0b", color: "#f1efe7", padding: 80, justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>InboxKnock</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 120, fontWeight: 800, lineHeight: 0.95, letterSpacing: -5 }}>
            <span>Knock before</span>
            <span>you send.</span>
          </div>
          <div style={{ fontSize: 30, color: "#b0b2a8" }}>Free email verification. No email is sent.</div>
        </div>
        <svg width="250" height="470" viewBox="100 150 200 345">
          <path d="M108 480V180a92 92 0 0 1 184 0v300" fill="none" stroke="#f1efe7" strokeWidth="3" />
          <path d="M122 480V184a78 78 0 0 1 156 0v296Z" fill="#4cf08c" />
          <path d="M122 480V184a78 78 0 0 1 22 -54v350Z" fill="#0c0d0b" stroke="#f1efe7" strokeWidth="3" />
        </svg>
      </div>
    ),
    size,
  );
}
