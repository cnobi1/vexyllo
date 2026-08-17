function hashToHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

export function buildPlaceholderSvg(prompt: string, style: string | null, label: string): string {
  const hue = hashToHue(prompt);
  const lines = wrapLines(prompt, 46);
  const lineHeight = 34;
  const startY = 288 - ((lines.length - 1) * lineHeight) / 2;

  const textLines = lines
    .map(
      (line, i) =>
        `<text x="512" y="${startY + i * lineHeight}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="26">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576">
    <rect width="100%" height="100%" fill="hsl(${hue}, 45%, 28%)" />
    <rect width="100%" height="100%" fill="black" opacity="0.15" />
    ${textLines}
    <text x="512" y="540" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16" opacity="0.7">${escapeXml(label)}${style ? ` — style: ${escapeXml(style)}` : ""} — set AI_GATEWAY_API_KEY for real generations</text>
  </svg>`;
}
