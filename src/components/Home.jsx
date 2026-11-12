import {
  ArrowUpRight,
  Check,
  ImagePlus,
  LockKeyhole,
  MousePointer2,
  Palette,
  ScanLine,
  Grid2X2,
  SlidersHorizontal,
  Shapes,
  Upload,
} from "lucide-react";
import { SAMPLES, TOOLS } from "../constants.js";
import ToolPreview from "./ToolPreview.jsx";
import RecentImages from "./RecentImages.jsx";

const icons = {
  color: Palette,
  edges: ScanLine,
  pixels: Grid2X2,
  enhance: SlidersHorizontal,
  shapes: Shapes,
};

export default function Home({
  onUpload,
  onTool,
  onSample,
  recentImages,
  onRecentImage,
}) {
  return (
    <div className="home-content">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> YOUR BROWSER-BASED IMAGE STUDIO
          </div>
          <h1>
            A little edit.
            <br />A whole new <span>image.</span>
            <svg viewBox="0 0 185 12" aria-hidden="true">
              <path d="M3 8 Q85 -2 182 6" />
            </svg>
          </h1>
          <p>
            Play with color. Bring out the details.
            <br />
            Make every pixel a little more you.
          </p>
          <button className="primary-button upload-hero" onClick={onUpload}>
            <Upload size={17} />
            Upload an image
            <ArrowUpRight size={17} />
          </button>
          <span className="upload-caption">
            or drag & drop it anywhere <span>·</span> JPG, PNG, WEBP
          </span>
        </div>
        <div
          className="hero-visual"
          aria-label="Before and after image editing preview"
        >
          <div className="photo-backdrop" />
          <div className="hero-photo">
            <img
              src={SAMPLES[0].file}
              alt="Colorful seaside village on the Italian coast"
            />
            <div className="hero-before">
              <img src={SAMPLES[0].file} alt="" />
            </div>
            <span className="photo-label label-before">Before</span>
            <span className="photo-label label-after">After</span>
            <div className="photo-divider">
              <span>
                <MousePointer2 size={17} />
              </span>
            </div>
          </div>
          <div className="hero-palette">
            <i />
            <i />
            <i />
            <i />
            <i />
            <Check size={14} />
          </div>
        </div>
      </section>

      <section className="tools-section">
        <div className="section-heading">
          <div>
            <h2>What will you create?</h2>
            <p>Pick a tool and let your curiosity take over.</p>
          </div>
        </div>
        <div className="tools-grid">
          {TOOLS.map((tool) => {
            const Icon = icons[tool.id];
            return (
              <button
                key={tool.id}
                className="tool-card group"
                onClick={() => onTool(tool.id)}
              >
                <ToolPreview tool={tool.id} />
                <div className="tool-card-content">
                  <div className="tool-card-top">
                    <span
                      className="tool-icon"
                      style={{
                        background: tool.background,
                        color: tool.accent,
                      }}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="tool-tag">{tool.tag}</span>
                    <span className="tool-arrow">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                  <h3>{tool.name}</h3>
                  <p>{tool.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <RecentImages recent={recentImages} onOpen={onRecentImage} />

      <section className="samples-section">
        <div className="sample-copy">
          <span className="sample-icon">
            <ImagePlus size={21} />
          </span>
          <div>
            <h3>Just looking around?</h3>
            <p>Try a sample. See where it takes you.</p>
          </div>
        </div>
        <div className="sample-options">
          {SAMPLES.map((sample) => (
            <button key={sample.id} onClick={() => onSample(sample)}>
              <img src={sample.file} alt="" />
              <span>{sample.name}</span>
              <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
      </section>
      <footer className="home-footer">
        <span>
          <LockKeyhole size={13} />
          Your images stay on your device. Always.
        </span>
      </footer>
    </div>
  );
}
