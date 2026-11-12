import { useEffect, useRef } from "react";
import { detectEdges, pixelate, blurImage } from "../imageProcessing.js";
import { renderShape } from "../shapes.js";
import { defaultSettings, SAMPLES } from "../constants.js";

export default function ToolPreview({ tool }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let disposed = false;
    const photo = new Image();
    photo.onload = () => {
      if (disposed) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = 640;
      canvas.height = 300;
      const scale = Math.max(
        canvas.width / photo.width,
        canvas.height / photo.height,
      );
      context.drawImage(
        photo,
        (canvas.width - photo.width * scale) / 2,
        (canvas.height - photo.height * scale) / 2,
        photo.width * scale,
        photo.height * scale,
      );
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      if (tool === "edges") {
        const edges = detectEdges(image, "sobel", 1.6, true);
        for (let i = 0; i < edges.data.length; i += 4) {
          const value = edges.data[i];
          edges.data[i] = value * 0.93;
          edges.data[i + 1] = value * 0.91;
          edges.data[i + 2] = value * 0.98;
        }
        context.putImageData(edges, 0, 0);
      }
      if (tool === "pixels") context.putImageData(pixelate(image, 15), 0, 0);
      if (tool === "enhance") {
        const blurred = blurImage(image, 14);
        context.putImageData(blurred, 0, 0, 210, 38, 225, 224);
      }
      if (tool === "shapes") {
        const style = {
          ...defaultSettings(),
          strokeWidth: 5,
          cornerRadius: 18,
        };
        renderShape(context, { x1: 195, y1: 43, x2: 435, y2: 255 }, style);
        renderShape(
          context,
          { x1: 67, y1: 68, x2: 162, y2: 163 },
          {
            ...style,
            shapeType: "circle",
            shapeFill: true,
            fillColor: "#f0c781",
            strokeColor: "#fff",
          },
        );
        renderShape(
          context,
          { x1: 562, y1: 247, x2: 454, y2: 131 },
          { ...style, shapeType: "arrow", strokeColor: "#fff" },
        );
      }
    };
    photo.src = SAMPLES[0].file;
    return () => {
      disposed = true;
    };
  }, [tool]);
  return (
    <div className={`tool-preview preview-${tool}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {tool === "color" && (
        <>
          <div className="color-strip strip-one" />
          <div className="color-strip strip-two" />
          <div className="preview-label">
            <span className="swatch" />
            <span className="swatch" />
            <span className="swatch" />
            <span className="swatch" />
            <span className="swatch" />
          </div>
        </>
      )}
      {tool === "edges" && (
        <span className="preview-pill">
          Sobel filter <span className="pill-dot" />
        </span>
      )}
      {tool === "pixels" && (
        <span className="preview-pill">
          A different perspective <span className="mini-pixels">▦</span>
        </span>
      )}
      {tool === "enhance" && (
        <div className="preview-selection">
          <i />
          <i />
          <i />
          <i />
          <span>Blur area</span>
        </div>
      )}
    </div>
  );
}
