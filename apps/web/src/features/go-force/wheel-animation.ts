const MAX_REASONABLE_ANIMATION_MS = 120_000;

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function webpDuration(bytes: Uint8Array): number {
  if (bytes.length < 12 || readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") {
    return 0;
  }

  let duration = 0;
  let frameCount = 0;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkName = readAscii(bytes, offset, 4);
    const chunkLength = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(
      0,
      true,
    );
    const dataOffset = offset + 8;
    const chunkEnd = dataOffset + chunkLength;
    if (chunkEnd > bytes.length) return 0;

    if (chunkName === "ANMF") {
      if (chunkLength < 16) return 0;
      duration +=
        bytes[dataOffset + 12]! | (bytes[dataOffset + 13]! << 8) | (bytes[dataOffset + 14]! << 16);
      frameCount += 1;
    }

    offset = chunkEnd + (chunkLength % 2);
  }

  return frameCount > 0 ? Math.min(duration, MAX_REASONABLE_ANIMATION_MS) : 0;
}

function skipGifSubBlocks(bytes: Uint8Array, start: number): number {
  let offset = start;
  while (offset < bytes.length) {
    const blockLength = bytes[offset++]!;
    if (blockLength === 0) return offset;
    offset += blockLength;
    if (offset > bytes.length) return bytes.length;
  }
  return bytes.length;
}

function gifDuration(bytes: Uint8Array): number {
  const header = readAscii(bytes, 0, 6);
  if (bytes.length < 13 || (header !== "GIF87a" && header !== "GIF89a")) return 0;

  const screenFlags = bytes[10]!;
  let offset = 13;
  if (screenFlags & 0x80) offset += 3 * 2 ** ((screenFlags & 0x07) + 1);

  let frameDelayMs = 0;
  let duration = 0;
  let frameCount = 0;
  while (offset < bytes.length) {
    const marker = bytes[offset++]!;
    if (marker === 0x3b) break;

    if (marker === 0x21) {
      const label = bytes[offset++]!;
      if (label === 0xf9) {
        const blockLength = bytes[offset++]!;
        if (blockLength < 4 || offset + blockLength >= bytes.length) return 0;
        frameDelayMs = (bytes[offset + 1]! | (bytes[offset + 2]! << 8)) * 10;
        offset += blockLength;
        if (bytes[offset] !== 0) return 0;
        offset += 1;
      } else {
        offset = skipGifSubBlocks(bytes, offset);
      }
      continue;
    }

    if (marker !== 0x2c || offset + 9 > bytes.length) return 0;
    const imageFlags = bytes[offset + 8]!;
    offset += 9;
    if (imageFlags & 0x80) offset += 3 * 2 ** ((imageFlags & 0x07) + 1);
    if (offset >= bytes.length) return 0;
    offset += 1; // LZW minimum code size
    offset = skipGifSubBlocks(bytes, offset);
    if (offset >= bytes.length) return 0;

    duration += frameDelayMs;
    frameDelayMs = 0;
    frameCount += 1;
  }

  return frameCount > 0 ? Math.min(duration, MAX_REASONABLE_ANIMATION_MS) : 0;
}

/**
 * Returns the total playback duration for non-looping Wheel of Names media.
 * Static or unreadable images return zero and can be committed as soon as they load.
 */
export function wheelAnimationDurationMs(animation: string, format: "gif" | "webp"): number {
  const bytes = decodeBase64(animation);
  if (!bytes) return 0;
  return format === "gif" ? gifDuration(bytes) : webpDuration(bytes);
}
