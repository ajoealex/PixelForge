import { Contrast, Eraser, SquareDashed } from "lucide-react";

export default function SelectionControls({
  selection,
  onChange,
  required,
  selecting,
  onSelectingChange,
  onInvert,
  image,
}) {
  return (
    <section className="control-section selection-controls">
      <div className="selection-heading">
        <h3>Selection</h3>
        <span>{required ? "Required for blur" : "Optional"}</span>
      </div>
      <div className="selection-tools">
        <button
          className={`secondary-button ${selecting ? "active" : ""}`}
          aria-pressed={selecting}
          onClick={onSelectingChange}
        >
          <SquareDashed size={14} />
          Draw selection
        </button>
        <button
          className="icon-button"
          aria-label="Clear selection"
          title="Clear selection (Esc)"
          disabled={!selection}
          onClick={() => onChange(null)}
        >
          <Eraser size={16} />
        </button>
      </div>
      {selection ? (
        <>
          <div className="selection-dimensions">
            <span>
              {selection.width} × {selection.height} px
            </span>
            <strong>
              {selection.inverted ? "Outside rectangle" : "Inside rectangle"}
            </strong>
          </div>
          <div className="coordinate-inputs">
            {["x", "y"].map((axis) => (
              <label key={axis}>
                {axis.toUpperCase()}
                <input
                  type="number"
                  min={0}
                  max={
                    axis === "x"
                      ? image.width - selection.width
                      : image.height - selection.height
                  }
                  value={selection[axis]}
                  onChange={(event) =>
                    onChange({
                      ...selection,
                      [axis]: Math.max(
                        0,
                        Math.min(
                          axis === "x"
                            ? image.width - selection.width
                            : image.height - selection.height,
                          Math.floor(Number(event.target.value)),
                        ),
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <button
            className={`secondary-button invert-selection ${selection.inverted ? "active" : ""}`}
            aria-pressed={Boolean(selection.inverted)}
            onClick={onInvert}
            title="Invert selection (Ctrl/⌘ + Shift + I)"
          >
            <Contrast size={14} />
            Invert selection<kbd>Ctrl ⇧ I</kbd>
          </button>
          <p className="field-help">
            {selection.inverted
              ? "The filter affects everything outside the rectangle."
              : "The filter affects the area inside the rectangle."}
          </p>
        </>
      ) : (
        <p className="field-help">
          {required
            ? "Draw a rectangle on the image to choose the blur area."
            : "The filter affects the whole image. Draw a rectangle to limit its area."}
        </p>
      )}
    </section>
  );
}
