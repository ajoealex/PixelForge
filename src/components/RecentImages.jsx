import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, LoaderCircle, Trash2 } from "lucide-react";
import { RECENT_IMAGE_LIMIT } from "../recentImages.js";

export default function RecentImages({ recent, onOpen }) {
  return (
    <section className="recent-images" aria-labelledby="recent-images-title">
      <div className="section-heading">
        <div>
          <h2 id="recent-images-title">Recent images</h2>
          <p>
            Your last {RECENT_IMAGE_LIMIT} opened images, saved on this device.
          </p>
        </div>
        {recent.saving && (
          <span className="recent-saving">
            <LoaderCircle size={13} className="animate-spin" />
            Saving image
          </span>
        )}
      </div>
      {recent.images.length > 0 ? (
        <div className="recent-image-grid">
          {recent.images.map((image) => (
            <RecentImage
              key={image.id}
              image={image}
              onOpen={onOpen}
              onRemove={recent.remove}
            />
          ))}
        </div>
      ) : (
        <div className="recent-empty">
          {recent.loading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Clock3 size={18} />
          )}
          <span>
            {recent.loading
              ? "Loading recent images…"
              : "Open an image to find it here next time."}
          </span>
        </div>
      )}
      {recent.error && (
        <div className="recent-storage-error" role="status">
          <span>{recent.error}</span>
          <button className="text-button" onClick={recent.retry}>
            Retry
          </button>
        </div>
      )}
    </section>
  );
}

function RecentImage({ image, onOpen, onRemove }) {
  const [thumbnail, setThumbnail] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(image.thumbnail);
    setThumbnail(url);
    return () => URL.revokeObjectURL(url);
  }, [image.thumbnail]);

  return (
    <article className="recent-image-card">
      <button
        className="recent-image-open"
        aria-label={`Open ${image.name}`}
        onClick={() => onOpen(image)}
      >
        <img src={thumbnail || undefined} alt="" />
        <div className="recent-image-caption">
          <div>
            <strong title={image.name}>{image.name}</strong>
            <span>
              {image.width} × {image.height} px
            </span>
          </div>
          <ArrowUpRight size={15} />
        </div>
      </button>
      <button
        className="recent-image-remove"
        title={`Remove ${image.name} from recent images`}
        aria-label={`Remove ${image.name} from recent images`}
        onClick={() => onRemove(image.id)}
      >
        <Trash2 size={14} />
      </button>
    </article>
  );
}
