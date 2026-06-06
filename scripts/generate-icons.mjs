/**
 * Rasterizes public/favicon.svg into the PNG icons the web app manifest and
 * iOS need. Run with: npm run icons
 *
 * Maskable icons get extra padding so the glyph isn't clipped by Android's
 * safe-zone mask.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'public/favicon.svg')
const svg = await readFile(src)

const BG = '#1a1a2e'

const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'icon-maskable-512.png', size: 512, pad: 64 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
]

for (const { file, size, pad } of targets) {
  const inner = size - pad * 2
  const glyph = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer()
  const out = await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: glyph, top: pad, left: pad }])
    .png()
    .toBuffer()
  await writeFile(resolve(root, 'public', file), out)
  console.log(`wrote public/${file} (${size}px, pad ${pad})`)
}
