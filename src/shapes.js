export function shapeBounds(shape, type) {
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);
  if (type === "circle") {
    const diameter = Math.min(width, height);
    return {
      x: shape.x1 + (shape.x2 < shape.x1 ? -diameter : 0),
      y: shape.y1 + (shape.y2 < shape.y1 ? -diameter : 0),
      width: diameter,
      height: diameter,
    };
  }
  return {
    x: Math.min(shape.x1, shape.x2),
    y: Math.min(shape.y1, shape.y2),
    width,
    height,
  };
}

// The displayed draft and the exported image use the same canvas drawing path.
export function renderShape(context, shape, settings) {
  if (!shape) return;
  const {
    shapeType,
    strokeColor,
    strokeWidth,
    strokeDotted,
    shapeFill,
    fillColor,
  } = settings;
  const { x, y, width, height } = shapeBounds(shape, shapeType);
  const isLine = shapeType === "line" || shapeType === "arrow";
  if (isLine ? Math.hypot(width, height) < 2 : width < 2 || height < 2) return;

  context.save();
  context.strokeStyle = strokeColor;
  context.fillStyle = fillColor;
  context.lineWidth = strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash(strokeDotted ? [0, strokeWidth * 2.4] : []);
  context.beginPath();
  if (isLine) {
    context.moveTo(shape.x1, shape.y1);
    context.lineTo(shape.x2, shape.y2);
  } else if (shapeType === "rectangle") {
    const radius = Math.min(settings.cornerRadius, width / 2, height / 2);
    context.roundRect(x, y, width, height, radius);
  } else {
    context.ellipse(
      x + width / 2,
      y + height / 2,
      width / 2,
      height / 2,
      0,
      0,
      Math.PI * 2,
    );
  }
  if (!isLine && shapeFill) context.fill();
  context.stroke();

  if (shapeType === "arrow") {
    const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
    const head = Math.min(
      Math.hypot(width, height) * 0.45,
      Math.max(18, strokeWidth * 4),
    );
    context.beginPath();
    context.moveTo(
      shape.x2 - head * Math.cos(angle - Math.PI / 6),
      shape.y2 - head * Math.sin(angle - Math.PI / 6),
    );
    context.lineTo(shape.x2, shape.y2);
    context.lineTo(
      shape.x2 - head * Math.cos(angle + Math.PI / 6),
      shape.y2 - head * Math.sin(angle + Math.PI / 6),
    );
    if (shapeFill) {
      context.closePath();
      context.fill();
    }
    context.stroke();
  }
  context.restore();
}

export function drawShape(image, shape, settings) {
  if (!shape) return image;
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.putImageData(image, 0, 0);
  renderShape(context, shape, settings);
  return context.getImageData(0, 0, image.width, image.height);
}
