import { useEffect, useRef, useState } from "react";
import p5 from "p5";
import { renderShape } from "../shapes.js";

export default function ImageCanvas({
  image,
  selection,
  onSelectionChange,
  selecting,
  drawingShape,
  shape,
  shapeSettings,
  onShapeChange,
  picking,
  onPick,
  onHover,
  zoom,
}) {
  const hostRef = useRef(null);
  const sketchRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const propsRef = useRef({});
  propsRef.current = {
    image,
    selection,
    onSelectionChange,
    selecting,
    drawingShape,
    shape,
    shapeSettings,
    onShapeChange,
    picking,
    onPick,
    onHover,
  };

  useEffect(() => {
    let start = null;
    let drawing = false;
    let canvas;
    const sketch = new p5((p) => {
      p.setup = () => {
        p.pixelDensity(1);
        canvas = p.createCanvas(1, 1).elt;
        canvas.setAttribute(
          "aria-label",
          "Image editing canvas. Drag to draw a shape or a rectangular filter selection using the active tool.",
        );
        canvas.setAttribute("role", "img");
        p.noLoop();
        sketchRef.current = p;
        p.redraw();
      };

      p.draw = () => {
        const {
          image: current,
          selection: region,
          shape: draft,
          shapeSettings: style,
        } = propsRef.current;
        if (!current) return;
        if (p.width !== current.width || p.height !== current.height)
          p.resizeCanvas(current.width, current.height, true);
        p.drawingContext.putImageData(current, 0, 0);
        renderShape(p.drawingContext, draft, style);
        if (region) {
          const scale =
            current.width /
            (canvas.getBoundingClientRect().width || current.width);
          p.push();
          p.noStroke();
          p.fill(0, 0, 0, 30);
          if (region.inverted) {
            p.rect(region.x, region.y, region.width, region.height);
          } else {
            p.rect(0, 0, current.width, region.y);
            p.rect(
              0,
              region.y + region.height,
              current.width,
              current.height - region.y - region.height,
            );
            p.rect(0, region.y, region.x, region.height);
            p.rect(
              region.x + region.width,
              region.y,
              current.width - region.x - region.width,
              region.height,
            );
          }
          p.noFill();
          p.stroke(255);
          p.strokeWeight(2 * scale);
          p.rect(region.x, region.y, region.width, region.height);
          if (region.inverted)
            p.rect(
              scale,
              scale,
              current.width - scale * 2,
              current.height - scale * 2,
            );
          p.stroke(61, 94, 35);
          p.strokeWeight(1 * scale);
          p.drawingContext.setLineDash([5 * scale, 4 * scale]);
          p.rect(region.x, region.y, region.width, region.height);
          p.drawingContext.setLineDash([]);
          p.fill(196, 239, 120);
          p.noStroke();
          for (const x of [region.x, region.x + region.width]) {
            for (const y of [region.y, region.y + region.height])
              p.square(x - 3 * scale, y - 3 * scale, 6 * scale);
          }
          p.pop();
        }
      };
    }, hostRef.current);

    const point = (event) => {
      const current = propsRef.current.image;
      const bounds = canvas.getBoundingClientRect();
      return {
        x: Math.max(
          0,
          Math.min(
            current.width - 1,
            Math.floor(
              ((event.clientX - bounds.left) / bounds.width) * current.width,
            ),
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            current.height - 1,
            Math.floor(
              ((event.clientY - bounds.top) / bounds.height) * current.height,
            ),
          ),
        ),
      };
    };
    const down = (event) => {
      const {
        image: current,
        selecting: canSelect,
        drawingShape: canDraw,
        picking: canPick,
        onPick: pick,
      } = propsRef.current;
      if (!current || event.button !== 0) return;
      const position = point(event);
      if (canDraw || canSelect) {
        event.preventDefault();
        start = position;
        drawing = canDraw;
        canvas.setPointerCapture(event.pointerId);
        if (drawing) propsRef.current.onShapeChange(null);
        else propsRef.current.onSelectionChange(null);
      } else if (canPick) {
        const index = (position.y * current.width + position.x) * 4;
        pick({ ...position, rgba: [...current.data.slice(index, index + 4)] });
      }
    };
    const move = (event) => {
      const { image: current, onHover: hover } = propsRef.current;
      if (!current) return;
      const position = point(event);
      const index = (position.y * current.width + position.x) * 4;
      hover({ ...position, rgba: [...current.data.slice(index, index + 4)] });
      if (start) {
        if (drawing) {
          propsRef.current.onShapeChange({
            x1: start.x,
            y1: start.y,
            x2: position.x,
            y2: position.y,
          });
        } else {
          propsRef.current.onSelectionChange({
            x: Math.min(start.x, position.x),
            y: Math.min(start.y, position.y),
            width: Math.abs(position.x - start.x) + 1,
            height: Math.abs(position.y - start.y) + 1,
            inverted: false,
          });
        }
      }
    };
    const up = (event) => {
      if (
        start &&
        !drawing &&
        propsRef.current.selection?.width < 3 &&
        propsRef.current.selection?.height < 3
      ) {
        propsRef.current.onSelectionChange(null);
      }
      start = null;
      drawing = false;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    };
    const leave = () => propsRef.current.onHover(null);

    // p5 initializes after the document is ready. Attach once its canvas exists.
    const attach = () => {
      canvas = hostRef.current?.querySelector("canvas");
      if (!canvas) return;
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
      canvas.addEventListener("pointerleave", leave);
    };
    const observer = new MutationObserver(attach);
    observer.observe(hostRef.current, { childList: true });
    attach();
    return () => {
      observer.disconnect();
      sketchRef.current = null;
      sketch.remove();
    };
  }, []);

  useEffect(() => {
    sketchRef.current?.redraw();
  }, [image, selection, selecting, shape, shapeSettings, zoom, fitScale]);

  useEffect(() => {
    const stage = hostRef.current.closest(".canvas-scroll");
    const fit = () =>
      setFitScale(
        Math.min(
          1,
          stage.clientWidth / image.width,
          stage.clientHeight / image.height,
        ),
      );
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    fit();
    return () => observer.disconnect();
  }, [image.width, image.height]);

  return (
    <div
      ref={hostRef}
      className={`p5-image ${selecting || drawingShape ? "is-selecting" : ""} ${picking ? "is-picking" : ""}`}
      style={{ width: `${image.width * fitScale * zoom}px` }}
    />
  );
}
