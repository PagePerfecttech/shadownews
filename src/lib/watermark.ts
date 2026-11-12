/**
 * Watermark Utility for Shadow News
 * Applies a light, semi-transparent SHADOW NEWS watermark onto uploaded images.
 */

export async function applyWatermark(imageBuffer: any, mimeType: string): Promise<any> {
  try {
    // Try dynamically importing sharp if installed
    const sharpModule = await import('sharp').catch(() => null);
    if (!sharpModule) {
      // Fallback: Return original buffer if sharp package is not installed
      return imageBuffer;
    }

    const sharp = sharpModule.default;
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Create SVG overlay text watermark
    const svgWatermark = Buffer.from(`
      <svg width="${width}" height="${height}">
        <style>
          .watermark-text {
            fill: rgba(255, 255, 255, 0.45);
            font-size: ${Math.max(16, Math.floor(width / 24))}px;
            font-weight: bold;
            font-family: sans-serif;
            letter-spacing: 1px;
          }
          .watermark-bg {
            fill: rgba(211, 47, 47, 0.35);
            rx: 6;
          }
        </style>
        <g transform="translate(${width - Math.floor(width / 3.2)}, ${height - 40})">
          <rect class="watermark-bg" x="0" y="-22" width="${Math.floor(width / 3.4)}" height="32"/>
          <text x="10" y="0" class="watermark-text">SHADOW NEWS</text>
        </g>
      </svg>
    `);

    const watermarkedBuffer = await sharp(imageBuffer)
      .composite([{ input: svgWatermark, top: 0, left: 0 }])
      .toBuffer();

    return watermarkedBuffer;
  } catch (error) {
    console.error('Watermark processing error:', error);
    return imageBuffer;
  }
}
