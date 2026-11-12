import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function ColorHistorySettings({ history }) {
  return (
    <section className="control-section color-history-settings">
      <label className="toggle-field">
        <span>
          Remember colors
          <small>Keep colors you choose or apply in this browser.</small>
        </span>
        <input
          type="checkbox"
          checked={history.enabled}
          onChange={(event) => history.setEnabled(event.target.checked)}
        />
        <span className="toggle-track" />
      </label>
      {history.error && (
        <p className="color-history-error" role="status">
          {history.error}
        </p>
      )}
    </section>
  );
}

export function ColorInput({ label, value, onChange, history }) {
  const id = useId();
  const inputRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    const input = inputRef.current;
    const rememberChoice = (event) => {
      pendingRef.current = null;
      history.remember(event.target.value);
    };
    // Native change commits a picker choice, while input events update the live preview.
    input.addEventListener("change", rememberChoice);
    return () => input.removeEventListener("change", rememberChoice);
  }, [history.remember]);

  return (
    <div className="color-field">
      <label className="color-field-label" htmlFor={id}>
        {label}
      </label>
      <label className="color-input" htmlFor={id}>
        <input
          ref={inputRef}
          id={id}
          type="color"
          value={value}
          onChange={(event) => {
            pendingRef.current = event.target.value;
            onChange(event.target.value);
          }}
          onBlur={() => {
            if (pendingRef.current) history.remember(pendingRef.current);
            pendingRef.current = null;
          }}
        />
        <span>{value.toUpperCase()}</span>
      </label>
      {history.colors.length > 0 && (
        <div className="saved-colors">
          <span className="saved-colors-label">Saved colors</span>
          <div
            className="saved-color-list"
            role="group"
            aria-label={`Saved colors for ${label}`}
          >
            {history.colors.map((color) => (
              <span
                className={`saved-color ${value.toLowerCase() === color ? "selected" : ""}`}
                key={color}
              >
                <button
                  className="saved-color-swatch"
                  style={{ backgroundColor: color }}
                  title={`Use ${color.toUpperCase()} for ${label.toLowerCase()}`}
                  aria-label={`Use ${color.toUpperCase()} for ${label.toLowerCase()}`}
                  aria-pressed={value.toLowerCase() === color}
                  onClick={() => {
                    onChange(color);
                    history.remember(color);
                  }}
                />
                <button
                  className="saved-color-remove"
                  title={`Remove ${color.toUpperCase()} from saved colors`}
                  aria-label={`Remove ${color.toUpperCase()} from saved colors`}
                  onClick={() => history.remove(color)}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
