import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  Eye,
  Grid2X2,
  ImagePlus,
  LayoutGrid,
  LoaderCircle,
  LockKeyhole,
  Maximize,
  Menu,
  Palette,
  Pipette,
  Plus,
  Redo2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Shapes,
  SlidersHorizontal,
  SquareDashed,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Home from "./components/Home.jsx";
import ToolControls from "./components/ToolControls.jsx";
import SelectionControls from "./components/SelectionControls.jsx";
import { ColorHistorySettings } from "./components/ColorControls.jsx";
import useColorHistory from "./useColorHistory.js";
import useRecentImages from "./useRecentImages.js";
import { SAMPLES, TOOLS, defaultSettings } from "./constants.js";

const toolIcons = {
  color: Palette,
  edges: ScanLine,
  pixels: Grid2X2,
  enhance: SlidersHorizontal,
  shapes: Shapes,
};
const EMPTY_HISTORY = { entries: [], position: -1 };
const ImageCanvas = lazy(() => import("./components/ImageCanvas.jsx"));

function Sidebar({ page, tool, onHome, onTool, onHelp, open, onClose }) {
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${open ? "mobile-open" : ""}`}>
        <button className="brand" onClick={onHome} aria-label="PixelForge home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            PixelForge<span className="brand-period">.</span>
          </span>
        </button>
        <span className="nav-label">WORKSPACE</span>
        <nav className="navigation" aria-label="Main navigation">
          <button className={page === "home" ? "active" : ""} onClick={onHome}>
            <LayoutGrid size={18} />
            <span>All tools</span>
            <span className="nav-count">{TOOLS.length}</span>
          </button>
          <div className="nav-divider" />
          {TOOLS.map((item) => {
            const Icon = toolIcons[item.id];
            return (
              <button
                key={item.id}
                className={
                  page === "editor" && tool === item.id ? "active" : ""
                }
                onClick={() => onTool(item.id)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-icon">
              <ShieldCheck size={20} />
            </span>
            <h3>A private little workspace.</h3>
            <p>
              Your photos stay on your device. Every edit happens right here in
              your browser.
            </p>
            <span className="privacy-local">
              <span /> 100% local processing
            </span>
          </div>
          <button className="help-nav" onClick={onHelp}>
            <CircleHelp size={17} />A little help
            <ArrowUpRightIcon />
          </button>
          <div className="sidebar-foot">
            <span className="mini-brand">
              <i />
              <i />
              <i />
              <i />
            </span>
            Powered by p5.js.
          </div>
        </div>
      </aside>
    </>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight size={14} style={{ transform: "rotate(-45deg)" }} />;
}

export default function App() {
  const colorHistory = useColorHistory();
  const recentImages = useRecentImages();
  const rememberImage = recentImages.remember;
  const [page, setPage] = useState("home");
  const [tool, setTool] = useState("color");
  const [settings, setSettings] = useState(defaultSettings);
  const [history, setHistory] = useState(EMPTY_HISTORY);
  const [original, setOriginal] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selection, setSelection] = useState(null);
  const [selectingRegion, setSelectingRegion] = useState(false);
  const [shape, setShape] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changed, setChanged] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [processingError, setProcessingError] = useState("");
  const [picking, setPicking] = useState(false);
  const [hoveredPixel, setHoveredPixel] = useState(null);
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("png");
  const [exportQuality, setExportQuality] = useState(92);
  const [exporting, setExporting] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);
  const workerRef = useRef(null);
  const requestRef = useRef(0);
  const loadRef = useRef(0);
  const dragDepth = useRef(0);
  const currentImage = history.entries[history.position] ?? null;
  const activeTool = TOOLS.find((item) => item.id === tool);
  const isBlur = tool === "enhance" && settings.effect === "blur";
  const isShapes = tool === "shapes";
  const selecting = !isShapes && (isBlur || selectingRegion);
  const scopeLabel = selection
    ? selection.inverted
      ? "Outside selection"
      : "Inside selection"
    : "Whole image";
  const displayImage = compare
    ? original
    : isShapes
      ? currentImage
      : (preview ?? currentImage);
  const notify = useCallback(
    (message, error = false) => setToast({ message, error }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const worker = new Worker(
      new URL("./processing.worker.js", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    worker.onmessage = ({ data }) => {
      if (data.id !== requestRef.current) return;
      setProcessing(false);
      if (data.error) {
        setProcessingError(data.error);
        setChanged(false);
      } else {
        setPreview(data.image);
        setChanged(data.changed);
        setProcessingError("");
      }
    };
    worker.onerror = () => {
      setProcessing(false);
      setChanged(false);
      setProcessingError(
        "This image could not be processed. Try a smaller image or another effect.",
      );
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = ++requestRef.current;
    if (!currentImage || page !== "editor") return;
    if (!previewEnabled) {
      setPreview(currentImage);
      setChanged(false);
      setProcessing(false);
      setProcessingError("");
      return;
    }
    setProcessing(true);
    setChanged(false);
    setProcessingError("");
    const timer = setTimeout(() => {
      workerRef.current?.postMessage({
        id,
        image: currentImage,
        tool,
        settings,
        selection,
        shape,
      });
    }, 110);
    return () => clearTimeout(timer);
  }, [currentImage, tool, settings, selection, shape, page, previewEnabled]);

  const resetControls = useCallback(() => {
    setSettings(defaultSettings());
    setSelection(null);
    setSelectingRegion(false);
    setShape(null);
    setPicking(false);
    setCompare(false);
    setProcessingError("");
    setPreviewEnabled(false);
  }, []);

  const loadImage = useCallback(
    async (source, name, nextTool = "color") => {
      const request = ++loadRef.current;
      ++requestRef.current;
      setLoading(true);
      const objectUrl =
        source instanceof Blob ? URL.createObjectURL(source) : null;
      try {
        const image = new Image();
        image.src = objectUrl ?? source;
        await image.decode();
        if (request !== loadRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        setHistory({ entries: [pixels], position: 0 });
        setOriginal(pixels);
        setPreview(pixels);
        setFileInfo({ name, width: canvas.width, height: canvas.height });
        setTool(nextTool);
        resetControls();
        setPreviewEnabled(true);
        setZoom(1);
        setPage("editor");
        setMobileNav(false);
        rememberImage(source, name, canvas);
      } catch {
        if (request === loadRef.current)
          notify(
            "This image could not be opened. Please choose a valid JPG, PNG, WEBP, GIF, or BMP image.",
            true,
          );
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        if (request === loadRef.current) setLoading(false);
      }
    },
    [notify, resetControls, rememberImage],
  );

  const uploadFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        notify("Choose an image file to get started.", true);
        return;
      }
      loadImage(file, file.name, page === "editor" ? tool : "color");
    },
    [loadImage, notify, page, tool],
  );

  const openTool = (id) => {
    setMobileNav(false);
    if (!currentImage) {
      loadImage(SAMPLES[0].file, SAMPLES[0].filename, id);
      return;
    }
    ++requestRef.current;
    setPreview(currentImage);
    setTool(id);
    resetControls();
    if (id !== "shapes") setSelection(selection);
    setPreviewEnabled(true);
    setPage("editor");
  };

  const goHome = () => {
    setPage("home");
    setMobileNav(false);
  };
  const chooseUpload = () => inputRef.current?.click();
  const updateSettings = (update) => {
    setPreviewEnabled(true);
    setCompare(false);
    setSettings(update);
  };
  const updateSelection = (region) => {
    setPreviewEnabled(true);
    setCompare(false);
    setSelection(region);
  };
  const invertSelection = useCallback(() => {
    setPreviewEnabled(true);
    setCompare(false);
    setSelection((previous) =>
      previous ? { ...previous, inverted: !previous.inverted } : previous,
    );
  }, []);
  const updateShape = (draft) => {
    setPreviewEnabled(true);
    setCompare(false);
    setShape(draft);
  };
  const canApply =
    changed &&
    !processing &&
    !processingError &&
    (!isBlur || Boolean(selection)) &&
    (!isShapes || Boolean(shape));
  const rememberActiveColors = () => {
    if (!changed) return;
    if (isShapes && shape) {
      colorHistory.remember(
        settings.shapeFill && settings.shapeType !== "line"
          ? [settings.strokeColor, settings.fillColor]
          : settings.strokeColor,
      );
    }
    if (
      tool === "pixels" &&
      ["replace", "mask"].includes(settings.pixelEffect)
    ) {
      colorHistory.remember(
        settings.pixelEffect === "replace"
          ? [settings.fromColor, settings.toColor]
          : settings.fromColor,
      );
    }
  };
  const applyChanges = () => {
    if (!canApply) return;
    rememberActiveColors();
    // Bound undo memory by pixel count while retaining at least the last edit.
    const maxEntries = Math.max(
      2,
      Math.min(20, Math.floor(160_000_000 / preview.data.byteLength)),
    );
    setHistory((previous) => {
      const entries = [
        ...previous.entries.slice(0, previous.position + 1),
        preview,
      ].slice(-maxEntries);
      return { entries, position: entries.length - 1 };
    });
    const appliedSettings = settings;
    resetControls();
    if (tool !== "color") setSettings(appliedSettings);
    setChanged(false);
    notify("Looking good. Your changes are applied.");
  };

  const undo = useCallback(() => {
    setHistory((previous) => {
      const position = Math.max(0, previous.position - 1);
      return { ...previous, position };
    });
    resetControls();
  }, [resetControls]);
  const redo = useCallback(() => {
    setHistory((previous) => {
      const position = Math.min(
        previous.entries.length - 1,
        previous.position + 1,
      );
      return { ...previous, position };
    });
    resetControls();
  }, [resetControls]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        setHelpOpen(false);
        setExportOpen(false);
        setMobileNav(false);
        if (helpOpen || exportOpen || mobileNav) return;
        setSelection(null);
        setSelectingRegion(false);
        setShape(null);
        setPicking(false);
        setPreviewEnabled(true);
      }
      if (page !== "editor" || helpOpen || exportOpen) return;
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "i" &&
        selection &&
        !isShapes
      ) {
        event.preventDefault();
        invertSelection();
        return;
      }
      if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName))
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey && history.position < history.entries.length - 1)
          redo();
        else if (!event.shiftKey && history.position > 0) undo();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "y" &&
        history.position < history.entries.length - 1
      ) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    page,
    history.position,
    history.entries.length,
    undo,
    redo,
    helpOpen,
    exportOpen,
    mobileNav,
    selection,
    isShapes,
    invertSelection,
  ]);

  useEffect(() => {
    const enter = (event) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      dragDepth.current++;
      setDragging(true);
    };
    const over = (event) => {
      if (event.dataTransfer.types.includes("Files")) event.preventDefault();
    };
    const leave = (event) => {
      event.preventDefault();
      if (--dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragging(false);
      }
    };
    const drop = (event) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      uploadFile(event.dataTransfer.files[0]);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [uploadFile]);

  const onPick = ({ x, y, rgba }) => {
    if (tool !== "pixels") return;
    setPreviewEnabled(true);
    if (settings.pixelEffect === "rgba") {
      setSettings((previous) => ({
        ...previous,
        pixelX: x,
        pixelY: y,
        rgbaR: rgba[0],
        rgbaG: rgba[1],
        rgbaB: rgba[2],
        rgbaA: rgba[3],
      }));
    } else {
      const hex =
        "#" +
        rgba
          .slice(0, 3)
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("");
      setSettings((previous) => ({ ...previous, fromColor: hex }));
      colorHistory.remember(hex);
      setPicking(false);
    }
  };

  const downloadImage = async () => {
    const pixels = preview ?? currentImage;
    if (!pixels || processing) return;
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      const context = canvas.getContext("2d");
      context.putImageData(pixels, 0, 0);
      if (exportFormat === "jpeg") {
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, `image/${exportFormat}`, exportQuality / 100),
      );
      if (!blob) throw new Error("Export failed");
      rememberActiveColors();
      const extension = exportFormat === "jpeg" ? "jpg" : exportFormat;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileInfo.name.replace(/\.[^.]+$/, "")}-pixelforge.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setExportOpen(false);
      notify("Your image is ready. Enjoy your new perspective.");
    } catch {
      notify("The image could not be exported. Please try again.", true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-shell">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        aria-label="Upload image"
        onChange={(event) => {
          uploadFile(event.target.files[0]);
          event.target.value = "";
        }}
      />
      <Sidebar
        page={page}
        tool={tool}
        onHome={goHome}
        onTool={openTool}
        onHelp={() => setHelpOpen(true)}
        open={mobileNav}
        onClose={() => setMobileNav(false)}
      />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-workspace">Workspace</span>
            <ChevronRight size={13} />
            <button onClick={goHome}>All tools</button>
            {page === "editor" && (
              <>
                <ChevronRight size={13} />
                <span className="current-crumb">{activeTool.name}</span>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <span />A little creativity. All local.
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button help-button"
              title="How to use PixelForge"
              aria-label="How to use PixelForge"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        {page === "home" ? (
          <Home
            recentImages={recentImages}
            onRecentImage={(image) => loadImage(image.blob, image.name)}
            onUpload={chooseUpload}
            onTool={openTool}
            onSample={(sample) => loadImage(sample.file, sample.filename)}
          />
        ) : (
          <div className="editor-content">
            <div className="editor-heading">
              <div>
                <button className="back-link" onClick={goHome}>
                  <ArrowLeft size={14} />
                  All tools
                </button>
                <h1>
                  {activeTool.name}
                  <span
                    className="editor-title-dot"
                    style={{ background: activeTool.accent }}
                  />
                </h1>
                <p>{activeTool.subtitle}</p>
              </div>
              <button
                className="primary-button export-button"
                onClick={() => setExportOpen(true)}
                disabled={!currentImage || processing}
              >
                <Download size={16} />
                Export image
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="editor-layout">
              <section className="image-workspace" aria-label="Image workspace">
                <div className="canvas-toolbar">
                  <div className="file-details">
                    <span className="file-icon">
                      <ImagePlus size={16} />
                    </span>
                    <div>
                      <strong title={fileInfo?.name}>{fileInfo?.name}</strong>
                      <small>
                        {fileInfo?.width} × {fileInfo?.height} px
                      </small>
                    </div>
                    <button
                      className="icon-button change-image"
                      title="Replace image"
                      aria-label="Replace image"
                      onClick={chooseUpload}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="canvas-actions">
                    <button
                      className="icon-button"
                      aria-label="Undo"
                      title="Undo (Ctrl+Z)"
                      disabled={history.position <= 0}
                      onClick={undo}
                    >
                      <Undo2 size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Redo"
                      title="Redo (Ctrl+Shift+Z)"
                      disabled={history.position >= history.entries.length - 1}
                      onClick={redo}
                    >
                      <Redo2 size={17} />
                    </button>
                    <span className="toolbar-divider" />
                    <button
                      className={`compare-button ${compare ? "active" : ""}`}
                      title="Compare with the uploaded original"
                      aria-pressed={compare}
                      onClick={() => setCompare(!compare)}
                    >
                      <Eye size={16} />
                      <span>Original</span>
                    </button>
                  </div>
                </div>
                <div className="canvas-area">
                  {selecting && (
                    <div className="canvas-instruction">
                      <SquareDashed size={14} />
                      {isBlur
                        ? "Draw a rectangle to select your blur area"
                        : "Drag to select an area for this filter"}
                    </div>
                  )}
                  {isShapes && (
                    <div className="canvas-instruction">
                      <Shapes size={14} />
                      Drag on the image to draw your shape
                    </div>
                  )}
                  {picking && tool === "pixels" && !selecting && (
                    <div className="canvas-instruction">
                      <Pipette size={14} />
                      Click the image to{" "}
                      {settings.pixelEffect === "rgba"
                        ? "inspect a pixel"
                        : "sample a color"}
                    </div>
                  )}
                  <div className="canvas-scroll">
                    <div className="canvas-center">
                      <Suspense
                        fallback={
                          <LoaderCircle className="animate-spin" size={25} />
                        }
                      >
                        {displayImage && (
                          <ImageCanvas
                            image={displayImage}
                            selection={isShapes || compare ? null : selection}
                            onSelectionChange={updateSelection}
                            selecting={selecting && !compare}
                            drawingShape={isShapes && !compare}
                            shape={isShapes && !compare ? shape : null}
                            shapeSettings={settings}
                            onShapeChange={updateShape}
                            picking={
                              tool === "pixels" &&
                              !selecting &&
                              (picking || settings.pixelEffect === "rgba") &&
                              !compare
                            }
                            onPick={onPick}
                            onHover={setHoveredPixel}
                            zoom={zoom}
                          />
                        )}
                      </Suspense>
                    </div>
                  </div>
                  {compare && (
                    <span className="original-badge">
                      <Eye size={13} />
                      Uploaded original
                    </span>
                  )}
                  {processing && (
                    <span className="processing-badge">
                      <LoaderCircle size={12} className="animate-spin" />
                      Updating preview
                    </span>
                  )}
                </div>
                <div className="canvas-statusbar">
                  <span className="pixel-readout">
                    {hoveredPixel ? (
                      <>
                        <i
                          style={{
                            background: `rgba(${hoveredPixel.rgba[0]},${hoveredPixel.rgba[1]},${hoveredPixel.rgba[2]},${hoveredPixel.rgba[3] / 255})`,
                          }}
                        />
                        <span>
                          {hoveredPixel.x}, {hoveredPixel.y}
                        </span>
                        <span className="rgba-readout">
                          RGBA {hoveredPixel.rgba.join(", ")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="status-dot" />
                        {isShapes ? "Draw shapes" : scopeLabel}
                        <span className="rgba-readout">
                          {isShapes
                            ? "Drag to draw, then apply to add another"
                            : selection?.inverted
                              ? "Rectangle is protected"
                              : "Live preview"}
                        </span>
                      </>
                    )}
                  </span>
                  <div className="zoom-controls">
                    <button
                      className="icon-button"
                      title="Zoom out"
                      aria-label="Zoom out"
                      disabled={zoom <= 0.25}
                      onClick={() =>
                        setZoom((value) => Math.max(0.25, value - 0.25))
                      }
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      className="zoom-label"
                      title="Fit image to workspace"
                      onClick={() => setZoom(1)}
                    >
                      {zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}
                    </button>
                    <button
                      className="icon-button"
                      title="Zoom in"
                      aria-label="Zoom in"
                      disabled={zoom >= 3}
                      onClick={() =>
                        setZoom((value) => Math.min(3, value + 0.25))
                      }
                    >
                      <ZoomIn size={14} />
                    </button>
                    <span className="toolbar-divider" />
                    <button
                      className="icon-button"
                      title="Fit to workspace"
                      aria-label="Fit to workspace"
                      onClick={() => setZoom(1)}
                    >
                      <Maximize size={14} />
                    </button>
                  </div>
                </div>
              </section>
              <aside className="controls-panel">
                <div className="controls-header">
                  <div>
                    <SlidersHorizontal size={16} />
                    <h2>Make it yours</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      resetControls();
                      setPreview(currentImage);
                    }}
                    title="Reset filter settings"
                  >
                    <RotateCcw size={13} />
                    Reset
                  </button>
                </div>
                <div className="controls-body">
                  {(isShapes ||
                    (tool === "pixels" &&
                      ["replace", "mask"].includes(settings.pixelEffect))) && (
                    <ColorHistorySettings history={colorHistory} />
                  )}
                  {!isShapes && (
                    <SelectionControls
                      selection={selection}
                      onChange={updateSelection}
                      required={isBlur}
                      selecting={selecting}
                      onSelectingChange={() => {
                        setSelectingRegion((previous) => isBlur || !previous);
                        setPicking(false);
                      }}
                      onInvert={invertSelection}
                      image={currentImage}
                    />
                  )}
                  <ToolControls
                    colorHistory={colorHistory}
                    tool={tool}
                    settings={settings}
                    setSettings={updateSettings}
                    shape={shape}
                    onClearShape={() => updateShape(null)}
                    picking={picking}
                    setPicking={(value) => {
                      setPicking(value);
                      if (value) setSelectingRegion(false);
                    }}
                    image={currentImage}
                  />
                </div>
                <div className="controls-footer">
                  {processingError && (
                    <p className="processing-error" role="alert">
                      {processingError}
                    </p>
                  )}
                  <button
                    className="primary-button apply-button"
                    disabled={!canApply}
                    onClick={applyChanges}
                  >
                    {processing ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Check size={16} />
                    )}
                    {processing
                      ? "Updating preview…"
                      : isShapes
                        ? "Apply shape"
                        : "Apply changes"}
                    <ArrowRight size={15} />
                  </button>
                  <span>
                    {isShapes
                      ? shape
                        ? "Apply this shape to add another"
                        : "Draw a shape to get started"
                      : isBlur && !selection
                        ? "Draw a rectangle to get started"
                        : "Preview first. Apply when it feels right."}
                  </span>
                </div>
              </aside>
            </div>
            <div className="editor-footnote">
              <LockKeyhole size={13} />
              <span>
                Processed on your device. Export at original resolution.
              </span>
              <button onClick={chooseUpload}>
                <Upload size={13} />
                Open another image
              </button>
            </div>
            {recentImages.error ? (
              <div className="recent-storage-error" role="status">
                <span>{recentImages.error}</span>
                <button className="text-button" onClick={recentImages.retry}>
                  Retry
                </button>
              </div>
            ) : (
              recentImages.saving && (
                <p className="recent-saving" role="status">
                  <LoaderCircle size={12} className="animate-spin" />
                  Saving image to this device…
                </p>
              )
            )}
          </div>
        )}
      </div>
      {helpOpen && (
        <Modal
          title="A little help goes a long way."
          onClose={() => setHelpOpen(false)}
        >
          <p className="modal-intro">
            Your browser is your image studio. Here’s how to get started.
          </p>
          <div className="help-steps">
            <div>
              <span>
                <Upload size={19} />
              </span>
              <section>
                <h3>Bring an image</h3>
                <p>
                  Upload a photo, drop a file anywhere, or try one of the
                  samples.
                </p>
              </section>
            </div>
            <div>
              <span>
                <SlidersHorizontal size={19} />
              </span>
              <section>
                <h3>Make it yours</h3>
                <p>
                  Choose a tool and preview your changes live. Blur requires a
                  rectangle. Other filters support optional selections. Invert a
                  selection to edit the area outside it with Ctrl/⌘ + Shift + I.
                  Use Draw shapes to add shapes, arrows, and lines.
                </p>
              </section>
            </div>
            <div>
              <span>
                <Download size={19} />
              </span>
              <section>
                <h3>Keep your creation</h3>
                <p>
                  Apply edits to build on them. Undo with Ctrl/⌘ + Z. Export
                  your preview as PNG, JPG, or WEBP at the original size.
                </p>
              </section>
            </div>
          </div>
          <div className="modal-privacy">
            <ShieldCheck size={17} />
            Your images are processed entirely on your device.
          </div>
          <button
            className="primary-button modal-done"
            onClick={() => setHelpOpen(false)}
          >
            Let’s create
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {exportOpen && (
        <Modal
          title="Ready for the world?"
          onClose={() => setExportOpen(false)}
        >
          <p className="modal-intro">
            Save your current preview at its original resolution.
          </p>
          <div className="export-image-info">
            <ImagePlus size={20} />
            <div>
              <strong>{fileInfo?.name}</strong>
              <span>
                {fileInfo?.width} × {fileInfo?.height} pixels
              </span>
            </div>
          </div>
          <label className="export-field">
            File format
            <select
              value={exportFormat}
              onChange={(event) => setExportFormat(event.target.value)}
            >
              <option value="png">PNG — lossless, supports transparency</option>
              <option value="jpeg">JPG — smaller file, white background</option>
              <option value="webp">
                WEBP — compact, supports transparency
              </option>
            </select>
          </label>
          {exportFormat !== "png" && (
            <label className="export-field">
              Quality <output>{exportQuality}%</output>
              <input
                type="range"
                min={10}
                max={100}
                value={exportQuality}
                onChange={(event) =>
                  setExportQuality(Number(event.target.value))
                }
              />
            </label>
          )}
          <button
            className="primary-button modal-done"
            onClick={downloadImage}
            disabled={exporting || processing || Boolean(processingError)}
          >
            {exporting ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <ArrowDownToLine size={16} />
            )}
            {exporting ? "Preparing image…" : "Download image"}
          </button>
        </Modal>
      )}
      {loading && (
        <div className="loading-overlay" role="status">
          <span>
            <LoaderCircle size={27} className="animate-spin" />
            <strong>Making room for your image…</strong>
          </span>
        </div>
      )}
      {dragging && (
        <div className="drop-overlay">
          <div>
            <Upload size={38} />
            <h2>A little drop. A fresh start.</h2>
            <p>Drop your image here to open it in PixelForge.</p>
          </div>
        </div>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <CircleHelp size={17} /> : <Check size={17} />}
          <span>{toast.message}</span>
          <button aria-label="Dismiss message" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const focusable = () => [
      ...dialog.querySelectorAll(
        'button:not(:disabled), select, input, [tabindex="0"]',
      ),
    ];
    focusable()[0]?.focus();
    const handleTab = (event) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const target = event.shiftKey ? elements.at(-1) : elements[0];
      if (
        (event.shiftKey && document.activeElement === elements[0]) ||
        (!event.shiftKey && document.activeElement === elements.at(-1))
      ) {
        event.preventDefault();
        target?.focus();
      }
    };
    dialog.addEventListener("keydown", handleTab);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.removeEventListener("keydown", handleTab);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="modal-close icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
