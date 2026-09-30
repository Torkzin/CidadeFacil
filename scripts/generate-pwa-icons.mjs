import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDirectory = path.join(process.cwd(), "public", "icons");

const iconDefinitions = {
  cidadao: {
    background: "#0f766e",
    accent: "#5eead4",
    symbol: `
      <path d="M256 114c-72 0-130 57-130 128 0 96 130 198 130 198s130-102 130-198c0-71-58-128-130-128Z" fill="#fff"/>
      <circle cx="256" cy="240" r="57" fill="#0f766e"/>
      <path d="m226 240 22 22 43-48" fill="none" stroke="#5eead4" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  gestao: {
    background: "#155e75",
    accent: "#67e8f9",
    symbol: `
      <path d="M128 219 256 124l128 95v171H128V219Z" fill="#fff"/>
      <path d="M100 224h312M180 390V264h152v126" fill="none" stroke="#155e75" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="256" cy="202" r="25" fill="#67e8f9"/>
      <path d="M154 390h204" fill="none" stroke="#fff" stroke-width="28" stroke-linecap="round"/>
    `,
  },
};

function svgFor(definition, maskable = false) {
  const inset = maskable ? 52 : 20;
  const radius = maskable ? 0 : 104;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <rect x="${inset}" y="${inset}" width="${512 - inset * 2}" height="${512 - inset * 2}" rx="${radius}" fill="${definition.background}"/>
      <circle cx="392" cy="118" r="86" fill="${definition.accent}" opacity=".14"/>
      <g>${definition.symbol}</g>
    </svg>
  `);
}

for (const [name, definition] of Object.entries(iconDefinitions)) {
  const directory = path.join(publicDirectory, name);
  await mkdir(directory, { recursive: true });
  await sharp(svgFor(definition)).resize(192, 192).png().toFile(path.join(directory, "icon-192.png"));
  await sharp(svgFor(definition)).resize(512, 512).png().toFile(path.join(directory, "icon-512.png"));
  await sharp(svgFor(definition, true)).resize(512, 512).png().toFile(path.join(directory, "icon-maskable-512.png"));
  await sharp(svgFor(definition)).resize(180, 180).png().toFile(path.join(directory, "apple-touch-icon.png"));
}

console.log("Ícones PWA gerados em public/icons.");
