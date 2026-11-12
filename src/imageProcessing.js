import { drawShape } from "./shapes.js";

export function copyImage(image) {
  return new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
}

export function adjustColors(image, settings) {
  const result = copyImage(image);
  const { data } = result;
  const brightness = settings.brightness * 2.55;
  const contrast = (settings.contrast + 100) / 100;
  const saturation = settings.saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let red = (data[i] - 128) * contrast + 128 + brightness;
    let green = (data[i + 1] - 128) * contrast + 128 + brightness;
    let blue = (data[i + 2] - 128) * contrast + 128 + brightness;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const amount = settings.grayscale ? 0 : saturation;
    red = (luminance + (red - luminance) * amount) * (1 + settings.red / 100);
    green =
      (luminance + (green - luminance) * amount) * (1 + settings.green / 100);
    blue =
      (luminance + (blue - luminance) * amount) * (1 + settings.blue / 100);
    data[i] = settings.invert ? 255 - red : red;
    data[i + 1] = settings.invert ? 255 - green : green;
    data[i + 2] = settings.invert ? 255 - blue : blue;
  }
  return result;
}

export function convolve(image, kernel, divisor = 1, bias = 0) {
  const result = copyImage(image);
  const { width, height, data } = image;
  const side = Math.sqrt(kernel.length);
  const half = Math.floor(side / 2);
  if (
    !Number.isInteger(side) ||
    side % 2 === 0 ||
    !kernel.every(Number.isFinite)
  ) {
    throw new Error(
      "Use a square, odd-sized kernel containing finite numbers.",
    );
  }
  if (!Number.isFinite(divisor) || divisor === 0 || !Number.isFinite(bias)) {
    throw new Error("Use a nonzero divisor and a finite offset.");
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        for (let ky = 0; ky < side; ky++) {
          const py = Math.max(0, Math.min(height - 1, y + ky - half));
          for (let kx = 0; kx < side; kx++) {
            const px = Math.max(0, Math.min(width - 1, x + kx - half));
            sum +=
              data[(py * width + px) * 4 + channel] * kernel[ky * side + kx];
          }
        }
        result.data[index + channel] = sum / divisor + bias;
      }
    }
  }
  return result;
}

const EDGE_KERNELS = {
  sobel: {
    x: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    y: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
  },
  prewitt: {
    x: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
    y: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  },
  scharr: {
    x: [-3, 0, 3, -10, 0, 10, -3, 0, 3],
    y: [-3, -10, -3, 0, 0, 0, 3, 10, 3],
    scale: 0.25,
  },
  laplacian: { x: [0, 1, 0, 1, -4, 1, 0, 1, 0] },
};

export function detectEdges(image, method, strength = 1, invert = false) {
  const result = copyImage(image);
  const { width, height, data } = image;
  const kernel = EDGE_KERNELS[method];
  if (!kernel) throw new Error("Choose a supported edge detector.");
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] =
      data[i * 4] * 0.2126 +
      data[i * 4 + 1] * 0.7152 +
      data[i * 4 + 2] * 0.0722;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const value = gray[py * width + px];
          const ki = (ky + 1) * 3 + kx + 1;
          gx += value * kernel.x[ki];
          gy += value * (kernel.y?.[ki] ?? 0);
        }
      }
      const edge = Math.min(
        255,
        Math.hypot(gx, gy) * strength * (kernel.scale ?? 1),
      );
      const index = (y * width + x) * 4;
      result.data[index] =
        result.data[index + 1] =
        result.data[index + 2] =
          invert ? 255 - edge : edge;
    }
  }
  return result;
}

// Sliding windows keep a blur linear in the number of pixels, even at larger radii.
function blurPass(input, output, width, height, radius, horizontal) {
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const stride = horizontal ? 4 : width * 4;
  const size = radius * 2 + 1;
  for (let line = 0; line < lines; line++) {
    const start = horizontal ? line * width * 4 : line * 4;
    for (let channel = 0; channel < 4; channel++) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset++) {
        sum +=
          input[
            start + Math.max(0, Math.min(length - 1, offset)) * stride + channel
          ];
      }
      for (let position = 0; position < length; position++) {
        output[start + position * stride + channel] = sum / size;
        const leaving = Math.max(0, position - radius);
        const entering = Math.min(length - 1, position + radius + 1);
        sum +=
          input[start + entering * stride + channel] -
          input[start + leaving * stride + channel];
      }
    }
  }
}

export function blurImage(image, radius) {
  const result = copyImage(image);
  const first = new Float32Array(image.data.length);
  const second = new Float32Array(image.data.length);
  // Premultiplied colors prevent dark halos around transparent pixels.
  for (let i = 0; i < first.length; i += 4) {
    const alpha = image.data[i + 3] / 255;
    first[i] = image.data[i] * alpha;
    first[i + 1] = image.data[i + 1] * alpha;
    first[i + 2] = image.data[i + 2] * alpha;
    first[i + 3] = image.data[i + 3];
  }
  const boxRadius = Math.max(1, Math.round(radius / 2));
  for (let pass = 0; pass < 3; pass++) {
    blurPass(first, second, image.width, image.height, boxRadius, true);
    blurPass(second, first, image.width, image.height, boxRadius, false);
  }
  for (let i = 0; i < first.length; i += 4) {
    const alpha = first[i + 3] / 255;
    result.data[i] = alpha ? first[i] / alpha : 0;
    result.data[i + 1] = alpha ? first[i + 1] / alpha : 0;
    result.data[i + 2] = alpha ? first[i + 2] / alpha : 0;
    result.data[i + 3] = first[i + 3];
  }
  return result;
}

export function pixelate(image, blockSize) {
  const result = copyImage(image);
  const size = Math.max(1, Math.round(blockSize));
  for (let y = 0; y < image.height; y += size) {
    for (let x = 0; x < image.width; x += size) {
      const endX = Math.min(image.width, x + size);
      const endY = Math.min(image.height, y + size);
      const sums = [0, 0, 0, 0];
      for (let py = y; py < endY; py++) {
        for (let px = x; px < endX; px++) {
          const i = (py * image.width + px) * 4;
          const alpha = image.data[i + 3] / 255;
          sums[0] += image.data[i] * alpha;
          sums[1] += image.data[i + 1] * alpha;
          sums[2] += image.data[i + 2] * alpha;
          sums[3] += image.data[i + 3];
        }
      }
      const count = (endX - x) * (endY - y);
      const alphaSum = sums[3] / 255;
      const average = [
        sums[0] / (alphaSum || 1),
        sums[1] / (alphaSum || 1),
        sums[2] / (alphaSum || 1),
        sums[3] / count,
      ];
      for (let py = y; py < endY; py++) {
        for (let px = x; px < endX; px++) {
          result.data.set(average, (py * image.width + px) * 4);
        }
      }
    }
  }
  return result;
}

function hexToRgb(hex) {
  return [1, 3, 5].map((position) =>
    Number.parseInt(hex.slice(position, position + 2), 16),
  );
}

export function replaceColor(image, from, to, tolerance, mask = false) {
  const result = copyImage(image);
  const target = hexToRgb(from);
  const replacement = hexToRgb(to);
  const distance = tolerance * Math.sqrt(3) * 2.55;
  for (let i = 0; i < result.data.length; i += 4) {
    const matches =
      Math.hypot(
        ...target.map((value, channel) => image.data[i + channel] - value),
      ) <= distance;
    if (mask) {
      result.data[i] =
        result.data[i + 1] =
        result.data[i + 2] =
          matches ? 255 : 0;
    } else if (matches) {
      result.data[i] = replacement[0];
      result.data[i + 1] = replacement[1];
      result.data[i + 2] = replacement[2];
    }
  }
  return result;
}

export function thresholdImage(image, level) {
  const result = copyImage(image);
  for (let i = 0; i < result.data.length; i += 4) {
    const gray =
      image.data[i] * 0.2126 +
      image.data[i + 1] * 0.7152 +
      image.data[i + 2] * 0.0722;
    result.data[i] =
      result.data[i + 1] =
      result.data[i + 2] =
        gray >= level ? 255 : 0;
  }
  return result;
}

export function denoiseImage(image) {
  const result = copyImage(image);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      for (let channel = 0; channel < 3; channel++) {
        const neighbors = [];
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.max(0, Math.min(image.width - 1, x + kx));
            const py = Math.max(0, Math.min(image.height - 1, y + ky));
            neighbors.push(image.data[(py * image.width + px) * 4 + channel]);
          }
        }
        neighbors.sort((a, b) => a - b);
        result.data[(y * image.width + x) * 4 + channel] = neighbors[4];
      }
    }
  }
  return result;
}

export function applyRegion(original, edited, selection) {
  if (!selection) return edited;
  const result = copyImage(selection.inverted ? edited : original);
  const inside = selection.inverted ? original : edited;
  const x = Math.min(original.width, Math.max(0, Math.floor(selection.x)));
  const y = Math.min(original.height, Math.max(0, Math.floor(selection.y)));
  const endX = Math.min(
    original.width,
    Math.ceil(selection.x + selection.width),
  );
  const endY = Math.min(
    original.height,
    Math.ceil(selection.y + selection.height),
  );
  if (endX <= x || endY <= y) return result;
  for (let py = y; py < endY; py++) {
    const start = (py * original.width + x) * 4;
    const end = (py * original.width + endX) * 4;
    result.data.set(inside.data.subarray(start, end), start);
  }
  return result;
}

export function processImage(image, tool, settings, selection, shape) {
  if (tool === "shapes") return drawShape(image, shape, settings);
  if (tool === "enhance" && settings.effect === "blur" && !selection)
    return image;
  let edited;
  if (tool === "color") edited = adjustColors(image, settings);
  if (tool === "edges")
    edited = detectEdges(
      image,
      settings.method,
      settings.strength,
      settings.invertEdges,
    );
  if (tool === "pixels") {
    if (settings.pixelEffect === "pixelate")
      edited = pixelate(image, settings.blockSize);
    if (settings.pixelEffect === "replace")
      edited = replaceColor(
        image,
        settings.fromColor,
        settings.toColor,
        settings.tolerance,
      );
    if (settings.pixelEffect === "mask")
      edited = replaceColor(
        image,
        settings.fromColor,
        settings.toColor,
        settings.tolerance,
        true,
      );
    if (settings.pixelEffect === "rgba") {
      edited = copyImage(image);
      const x = Math.floor(
        Math.max(0, Math.min(image.width - 1, settings.pixelX)),
      );
      const y = Math.floor(
        Math.max(0, Math.min(image.height - 1, settings.pixelY)),
      );
      const index = (y * image.width + x) * 4;
      edited.data.set(
        [settings.rgbaR, settings.rgbaG, settings.rgbaB, settings.rgbaA],
        index,
      );
    }
  }
  if (tool === "enhance") {
    if (settings.effect === "blur") edited = blurImage(image, settings.radius);
    if (settings.effect === "pixelate")
      edited = pixelate(image, settings.blockSize);
    if (settings.effect === "sharpen") {
      const amount = settings.sharpness;
      edited = convolve(image, [
        0,
        -amount,
        0,
        -amount,
        1 + 4 * amount,
        -amount,
        0,
        -amount,
        0,
      ]);
    }
    if (settings.effect === "threshold")
      edited = thresholdImage(image, settings.threshold);
    if (settings.effect === "denoise") edited = denoiseImage(image);
    if (settings.effect === "custom")
      edited = convolve(
        image,
        settings.kernel.map(Number),
        Number(settings.divisor),
        Number(settings.bias),
      );
  }
  return applyRegion(image, edited ?? image, selection);
}
