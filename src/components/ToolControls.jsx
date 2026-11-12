import {
  Aperture,
  ArrowUpRight,
  Blend,
  Check,
  ChevronDown,
  Circle,
  Crosshair,
  Grid2X2,
  Minus,
  Pipette,
  RectangleHorizontal,
  ScanLine,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { ColorInput } from "./ColorControls.jsx";
import { SAMPLES } from "../constants.js";

function Range({
  label,
  value,
  onChange,
  min = -100,
  max = 100,
  step = 1,
  suffix = "",
  color,
  display,
}) {
  return (
    <label className="range-field">
      <span className="range-label">
        <span>
          {color && <i style={{ background: color }} />}
          {label}
        </span>
        <output>
          {display ?? value}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          "--range-progress": `${((value - min) / (max - min)) * 100}%`,
        }}
      />
    </label>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="toggle-field">
      <span>
        <span>{label}</span>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" />
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section className="control-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function ToolControls({
  tool,
  settings,
  setSettings,
  shape,
  onClearShape,
  picking,
  setPicking,
  image,
  colorHistory,
}) {
  const set = (key, value) =>
    setSettings((previous) => ({ ...previous, [key]: value }));
  const selectPixel = (x, y) => {
    const index = (y * image.width + x) * 4;
    const rgba = image.data.slice(index, index + 4);
    setSettings((previous) => ({
      ...previous,
      pixelX: x,
      pixelY: y,
      rgbaR: rgba[0],
      rgbaG: rgba[1],
      rgbaB: rgba[2],
      rgbaA: rgba[3],
    }));
  };

  if (tool === "shapes")
    return (
      <>
        <Section title="Shape">
          <div className="shape-choices">
            {[
              ["rectangle", "Rectangle", RectangleHorizontal],
              ["circle", "Circle", Circle],
              ["oval", "Oval", Circle],
              ["arrow", "Arrow", ArrowUpRight],
              ["line", "Line", Minus],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                className={`shape-choice ${settings.shapeType === id ? "selected" : ""}`}
                aria-pressed={settings.shapeType === id}
                onClick={() => set("shapeType", id)}
              >
                <Icon size={21} className={id === "oval" ? "oval-icon" : ""} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <p className="field-help">
            Drag on the image to draw. Apply your shape to add another.
          </p>
          {shape && (
            <button className="text-button clear-shape" onClick={onClearShape}>
              Clear current shape
            </button>
          )}
        </Section>
        <Section title="Stroke">
          <ColorInput
            label="Stroke color"
            history={colorHistory}
            value={settings.strokeColor}
            onChange={(value) => set("strokeColor", value)}
          />
          <Range
            label="Stroke width"
            value={settings.strokeWidth}
            min={1}
            max={60}
            suffix=" px"
            onChange={(value) => set("strokeWidth", value)}
          />
          <div className="stroke-styles" role="group" aria-label="Stroke style">
            {[
              [false, "Solid"],
              [true, "Dotted"],
            ].map(([dotted, label]) => (
              <button
                key={label}
                className={settings.strokeDotted === dotted ? "active" : ""}
                aria-pressed={settings.strokeDotted === dotted}
                onClick={() => set("strokeDotted", dotted)}
              >
                <span
                  className={
                    dotted ? "stroke-example dotted" : "stroke-example"
                  }
                />
                {label}
              </button>
            ))}
          </div>
        </Section>
        {settings.shapeType !== "line" && (
          <Section title="Fill">
            <Toggle
              label={
                settings.shapeType === "arrow" ? "Fill arrowhead" : "Fill shape"
              }
              checked={settings.shapeFill}
              onChange={(value) => set("shapeFill", value)}
            />
            {settings.shapeFill && (
              <ColorInput
                label="Fill color"
                history={colorHistory}
                value={settings.fillColor}
                onChange={(value) => set("fillColor", value)}
              />
            )}
          </Section>
        )}
        {settings.shapeType === "rectangle" && (
          <Section title="Corners">
            <Range
              label="Border radius"
              value={settings.cornerRadius}
              min={0}
              max={200}
              suffix=" px"
              onChange={(value) => set("cornerRadius", value)}
            />
          </Section>
        )}
      </>
    );

  if (tool === "color")
    return (
      <>
        <Section title="Quick looks">
          <div className="looks-grid">
            {[
              {
                name: "Original",
                className: "natural",
                values: {
                  brightness: 0,
                  contrast: 0,
                  saturation: 100,
                  red: 0,
                  green: 0,
                  blue: 0,
                  grayscale: false,
                  invert: false,
                },
              },
              {
                name: "Vivid",
                className: "vivid",
                values: {
                  brightness: 5,
                  contrast: 18,
                  saturation: 140,
                  red: 0,
                  green: 0,
                  blue: 0,
                  grayscale: false,
                  invert: false,
                },
              },
              {
                name: "Warm",
                className: "warm",
                values: {
                  brightness: 4,
                  contrast: 5,
                  saturation: 110,
                  red: 12,
                  green: 2,
                  blue: -12,
                  grayscale: false,
                  invert: false,
                },
              },
              {
                name: "Mono",
                className: "mono",
                values: {
                  brightness: 0,
                  contrast: 12,
                  saturation: 100,
                  red: 0,
                  green: 0,
                  blue: 0,
                  grayscale: true,
                  invert: false,
                },
              },
            ].map((look) => (
              <button
                className="look"
                key={look.name}
                onClick={() =>
                  setSettings((previous) => ({ ...previous, ...look.values }))
                }
              >
                <img src={SAMPLES[0].file} alt="" className={look.className} />
                <span>{look.name}</span>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Light & color">
          <Range
            label="Brightness"
            value={settings.brightness}
            onChange={(value) => set("brightness", value)}
          />
          <Range
            label="Contrast"
            value={settings.contrast}
            onChange={(value) => set("contrast", value)}
          />
          <Range
            label="Saturation"
            value={settings.saturation}
            min={0}
            max={200}
            suffix="%"
            onChange={(value) => set("saturation", value)}
          />
        </Section>
        <Section title="RGB channels">
          <Range
            label="Red"
            color="#e58886"
            value={settings.red}
            onChange={(value) => set("red", value)}
          />
          <Range
            label="Green"
            color="#86ad88"
            value={settings.green}
            onChange={(value) => set("green", value)}
          />
          <Range
            label="Blue"
            color="#839ed5"
            value={settings.blue}
            onChange={(value) => set("blue", value)}
          />
        </Section>
        <Section title="Transform">
          <Toggle
            label="Grayscale"
            checked={settings.grayscale}
            onChange={(value) => set("grayscale", value)}
          />
          <Toggle
            label="Invert colors"
            checked={settings.invert}
            onChange={(value) => set("invert", value)}
          />
        </Section>
      </>
    );

  if (tool === "edges")
    return (
      <>
        <Section title="Detection method">
          <div className="method-grid">
            {[
              ["sobel", "Sobel", "Balanced detail", ScanLine],
              ["prewitt", "Prewitt", "Simple gradients", Grid2X2],
              ["laplacian", "Laplacian", "Fine boundaries", Aperture],
              ["scharr", "Scharr", "Precise gradients", Crosshair],
            ].map(([id, name, description, Icon]) => (
              <button
                key={id}
                className={`method-button ${settings.method === id ? "selected" : ""}`}
                onClick={() => set("method", id)}
              >
                <Icon size={22} />
                <strong>{name}</strong>
                <small>{description}</small>
                {settings.method === id && (
                  <Check className="method-check" size={13} />
                )}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Fine-tune">
          <Range
            label="Edge strength"
            value={settings.strength}
            min={0.1}
            max={3}
            step={0.1}
            suffix="×"
            onChange={(value) => set("strength", value)}
          />
          <Toggle
            label="Light background"
            description="Display dark edges on white"
            checked={settings.invertEdges}
            onChange={(value) => set("invertEdges", value)}
          />
        </Section>
        <div className="control-note">
          <ScanLine size={18} />
          <p>
            Highlight changes in brightness to reveal boundaries, textures, and
            shapes.
          </p>
        </div>
      </>
    );

  if (tool === "pixels")
    return (
      <>
        <Section title="Pixel operation">
          <div className="segmented-grid">
            {[
              ["pixelate", "Pixelate"],
              ["replace", "Replace color"],
              ["mask", "Color mask"],
              ["rgba", "Edit RGBA"],
            ].map(([id, name]) => (
              <button
                key={id}
                className={settings.pixelEffect === id ? "active" : ""}
                onClick={() => {
                  set("pixelEffect", id);
                  setPicking(id === "rgba");
                  if (id === "rgba")
                    selectPixel(settings.pixelX, settings.pixelY);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </Section>
        {settings.pixelEffect === "pixelate" && (
          <>
            <Section title="Pixel size">
              <Range
                label="Block size"
                value={settings.blockSize}
                min={2}
                max={80}
                suffix=" px"
                onChange={(value) => set("blockSize", value)}
              />
            </Section>
            <div className="control-note">
              <Grid2X2 size={18} />
              <p>
                Each block takes the average color of its pixels. Larger blocks
                create a more abstract image.
              </p>
            </div>
          </>
        )}
        {["replace", "mask"].includes(settings.pixelEffect) && (
          <>
            <Section
              title={
                settings.pixelEffect === "mask"
                  ? "Mask color"
                  : "Color replacement"
              }
            >
              <ColorInput
                label="Source color"
                history={colorHistory}
                value={settings.fromColor}
                onChange={(value) => set("fromColor", value)}
              />
              <button
                className={`secondary-button eyedropper-button ${picking ? "active" : ""}`}
                onClick={() => setPicking(!picking)}
              >
                <Pipette size={15} />
                {picking
                  ? "Click image to pick a color"
                  : "Pick color from image"}
              </button>
              {settings.pixelEffect === "replace" && (
                <ColorInput
                  label="Replace with"
                  history={colorHistory}
                  value={settings.toColor}
                  onChange={(value) => set("toColor", value)}
                />
              )}
              <Range
                label="Color tolerance"
                value={settings.tolerance}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => set("tolerance", value)}
              />
            </Section>
            {settings.pixelEffect === "mask" && (
              <div className="control-note">
                <Blend size={18} />
                <p>
                  Matching pixels become white. The remaining pixels become
                  black. Adjust tolerance to include similar colors.
                </p>
              </div>
            )}
          </>
        )}
        {settings.pixelEffect === "rgba" && (
          <>
            <div className="control-note">
              <Pipette size={18} />
              <p>
                Click a pixel on the image to read its RGBA values, then change
                its channels below.
              </p>
            </div>
            <Section title="Pixel position">
              <div className="coordinate-inputs">
                <label>
                  X
                  <input
                    type="number"
                    min={0}
                    max={image.width - 1}
                    value={settings.pixelX}
                    onChange={(event) =>
                      selectPixel(
                        Math.floor(
                          Math.max(
                            0,
                            Math.min(
                              image.width - 1,
                              Number(event.target.value),
                            ),
                          ),
                        ),
                        settings.pixelY,
                      )
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    min={0}
                    max={image.height - 1}
                    value={settings.pixelY}
                    onChange={(event) =>
                      selectPixel(
                        settings.pixelX,
                        Math.floor(
                          Math.max(
                            0,
                            Math.min(
                              image.height - 1,
                              Number(event.target.value),
                            ),
                          ),
                        ),
                      )
                    }
                  />
                </label>
              </div>
            </Section>
            <Section title="RGBA values">
              <Range
                label="Red"
                color="#e58886"
                value={settings.rgbaR}
                min={0}
                max={255}
                onChange={(value) => set("rgbaR", value)}
              />
              <Range
                label="Green"
                color="#86ad88"
                value={settings.rgbaG}
                min={0}
                max={255}
                onChange={(value) => set("rgbaG", value)}
              />
              <Range
                label="Blue"
                color="#839ed5"
                value={settings.rgbaB}
                min={0}
                max={255}
                onChange={(value) => set("rgbaB", value)}
              />
              <Range
                label="Alpha"
                color="#aaa6b3"
                value={settings.rgbaA}
                min={0}
                max={255}
                onChange={(value) => set("rgbaA", value)}
              />
            </Section>
          </>
        )}
      </>
    );

  return (
    <>
      <Section title="Choose an effect">
        <div className="effect-select">
          <WandSparkles size={17} />
          <select
            aria-label="Enhancement effect"
            value={settings.effect}
            onChange={(event) => set("effect", event.target.value)}
          >
            <option value="blur">Selective blur</option>
            <option value="pixelate">Pixelate</option>
            <option value="sharpen">Sharpen</option>
            <option value="threshold">Threshold</option>
            <option value="denoise">Denoise</option>
            <option value="custom">Custom convolution</option>
          </select>
          <ChevronDown size={15} />
        </div>
      </Section>
      {settings.effect === "blur" && (
        <>
          <Section title="Blur settings">
            <Range
              label="Blur strength"
              value={settings.radius}
              min={1}
              max={60}
              suffix=" px"
              onChange={(value) => set("radius", value)}
            />
          </Section>
        </>
      )}
      {settings.effect === "pixelate" && (
        <Section title="Pixelation">
          <Range
            label="Block size"
            value={settings.blockSize}
            min={2}
            max={80}
            suffix=" px"
            onChange={(value) => set("blockSize", value)}
          />
        </Section>
      )}
      {settings.effect === "sharpen" && (
        <Section title="Sharpen settings">
          <Range
            label="Amount"
            value={settings.sharpness}
            min={0.1}
            max={3}
            step={0.1}
            suffix="×"
            onChange={(value) => set("sharpness", value)}
          />
        </Section>
      )}
      {settings.effect === "threshold" && (
        <Section title="Threshold settings">
          <Range
            label="Threshold"
            value={settings.threshold}
            min={0}
            max={255}
            onChange={(value) => set("threshold", value)}
          />
        </Section>
      )}
      {settings.effect === "denoise" && (
        <div className="control-note">
          <Sparkles size={18} />
          <p>
            A 3 × 3 median filter reduces isolated noise while retaining the
            image’s edges.
          </p>
        </div>
      )}
      {settings.effect === "custom" && (
        <Section title="3 × 3 convolution kernel">
          <div className="kernel-grid">
            {settings.kernel.map((value, index) => (
              <input
                key={index}
                type="number"
                step="any"
                aria-label={`Kernel row ${Math.floor(index / 3) + 1} column ${(index % 3) + 1}`}
                value={value}
                onChange={(event) =>
                  set(
                    "kernel",
                    settings.kernel.map((current, i) =>
                      i === index ? event.target.value : current,
                    ),
                  )
                }
              />
            ))}
          </div>
          <div className="coordinate-inputs">
            <label>
              Divisor
              <input
                type="number"
                step="any"
                value={settings.divisor}
                onChange={(event) => set("divisor", event.target.value)}
              />
            </label>
            <label>
              Offset
              <input
                type="number"
                step="any"
                value={settings.bias}
                onChange={(event) => set("bias", event.target.value)}
              />
            </label>
          </div>
          <p className="field-help">
            The weighted sum is divided by the divisor, then the offset is
            added.
          </p>
        </Section>
      )}
    </>
  );
}
