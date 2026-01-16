/**
 * PWA Icon Generator Script
 *
 * This script generates PWA icons from an SVG source.
 * Run: node scripts/generate-pwa-icons.js
 *
 * Requirements:
 * - npm install sharp
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const inputSvg = path.join(__dirname, '../public/icons/icon.svg')
const outputDir = path.join(__dirname, '../public/icons')

async function generateIcons() {
  console.log('Generating PWA icons...')

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Read SVG file
  const svgBuffer = fs.readFileSync(inputSvg)

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`)

    try {
      await sharp(svgBuffer).resize(size, size).png().toFile(outputPath)

      console.log(`✓ Generated: icon-${size}x${size}.png`)
    } catch (error) {
      console.error(
        `✗ Failed to generate icon-${size}x${size}.png:`,
        error.message
      )
    }
  }

  console.log('\nDone! Icons generated in public/icons/')
}

generateIcons().catch(console.error)
