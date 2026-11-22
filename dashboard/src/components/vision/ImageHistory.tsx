/* eslint-disable @next/next/no-img-element -- thumbnails come from the backend API */
import { imageUrls } from "@/lib/api";
import type { ImageRecord } from "@/types/api";
import { Badge } from "@/components/ui";

const countLabel = (n: number | null | undefined) => (n == null ? "—" : `${n} ${n === 1 ? "larva" : "larvae"}`);

const STATUS_TONE ={ completed: "ok", failed: "danger", pending: "warn", processing: "warn", none: "neutral" } as const;

export function ImageHistory({
  images,
  selectedId,
  onSelect,
}: {
  images: ImageRecord[];
  selectedId?: string;
  onSelect: (image: ImageRecord) => void;
}) {
  if (!images.length) return <p className="text-sm text-muted">No images yet. Capture or upload one to start.</p>;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {images.map((img) => (
        <li key={img._id}>
          <button
            type="button"
            onClick={() => onSelect(img)}
            className={`w-full overflow-hidden rounded-lg border text-left transition-colors ${
              img._id === selectedId ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent"
            }`}
          >
            <img src={imageUrls.original(img._id)} alt="" loading="lazy" className="aspect-square w-full bg-black/5 object-cover" />
            <div className="space-y-1 p-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{countLabel(img.latestAnalysis?.larvaeCount)}</span>
                <Badge tone={STATUS_TONE[img.analysisStatus]}>{img.analysisStatus}</Badge>
              </div>
              <p className="truncate text-xs text-muted">
                {new Date(img.capturedAt).toLocaleTimeString()}
                {img.source === "sample_dataset" ? " · sample" : ""}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
