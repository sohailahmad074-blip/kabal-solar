/**
 * Generate a visual Code 128 standard barcode SVG pattern
 */

// Code 128 B Character Set encoding table (patterns of bars and spaces)
const CODE128_PATTERNS: { [char: string]: string } = {
  ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
  '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
  '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
  ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
  '0': '10011101100', '1': '10011100110', '2': '11001110010', '3': '11001011100',
  '4': '11001001110', '5': '11011100100', '6': '11001110100', '7': '11101101110',
  '8': '11101001100', '9': '11100101100', ':': '11100100110', ';': '11101100100',
  '<': '11100110100', '=': '11100110010', '>': '11011011000', '?': '11011000110',
  '@': '11000110110', 'A': '10100011000', 'B': '10001011000', 'C': '10001000110',
  'D': '10110001000', 'E': '10001101000', 'F': '10001100010', 'G': '11010001000',
  'H': '11000101000', 'I': '11000100010', 'J': '10110111000', 'K': '10110001110',
  'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'O': '10001110110',
  'P': '11101110110', 'Q': '11010001110', 'R': '11000101110', 'S': '11011101000',
  'T': '11011100010', 'U': '11011101110', 'V': '11101011000', 'W': '11101000110',
  'X': '11100010110', 'Y': '11101101000', 'Z': '11101100010', '[': '11100011010',
  '\\': '11101111010', ']': '11001000010', '^': '11110001010', '_': '10100110000',
};

const START_CODE_B = '11010010000';
const STOP_CODE = '1100011101011';

/**
 * Encode string into binary black/white bar string
 */
export const encodeCode128Binary = (text: string): string => {
  const clean = text.toUpperCase().replace(/[^A-Z0-9 \-_.:/]/g, '');
  let binary = START_CODE_B;
  
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const pattern = CODE128_PATTERNS[char] || CODE128_PATTERNS['0'];
    binary += pattern;
  }
  
  binary += STOP_CODE;
  return binary;
};

/**
 * Generate an SVG barcode markup
 */
export const generateBarcodeSvg = (
  text: string, 
  options: { width?: number; height?: number; barColor?: string; showText?: boolean } = {}
): string => {
  const { width = 240, height = 70, barColor = '#0f172a', showText = true } = options;
  const binary = encodeCode128Binary(text);
  
  const barWidth = width / binary.length;
  let rects = '';
  
  const barcodeHeight = showText ? height - 16 : height;
  
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      const x = (i * barWidth).toFixed(2);
      const w = (barWidth + 0.2).toFixed(2); // slight overlap to prevent sub-pixel gaps
      rects += `<rect x="${x}" y="0" width="${w}" height="${barcodeHeight}" fill="${barColor}" />`;
    }
  }
  
  const textElement = showText
    ? `<text x="${width / 2}" y="${height}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" fill="${barColor}" letter-spacing="2">${text}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${rects}${textElement}</svg>`;
};
