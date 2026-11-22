/* eslint-disable @next/next/no-img-element -- images come from the backend API, not the Next.js image pipeline */
import { imageUrls } from "@/lib/api";
import type { ImageAnalysis, ImageRecord } from "@/types/api";
import { Badge } from "@/components/ui";

const mm = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)} mm`);

export function SourceBadge({ source }: { source: ImageRecord["source"] }) {
  if (source === "sample_dataset") return <Badge tone="warn">Sample sheet, not a live tray</Badge>;
  if (source === "camera") return <Badge tone="ok">Camera</Badge>;
  return <Badge>Upload</Badge>;
}

export function AnalysisView({ image, analysis }: { image: ImageRecord; analysis: ImageAnalysis }) {
  const src = analysis.hasAnnotatedImage ? imageUrls.annotated(image._id, analysis._id) : imageUrls.original(image._id);
  const { lengthMm } = analysis;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={image.source} />
        <Badge tone={analysis.calibrated ? "ok" : "neutral"}>{analysis.calibrated ? "Calibrated (20 mm square)" : "No calibration square"}</Badge>
        <span className="text-xs text-muted">
          {image.trayCode} · {new Date(image.capturedAt).toLocaleString()}
        </span>
      </div>

      <a href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border bg-black/5">
        <img src={src} alt={`Analysed image with ${analysis.larvaeCount ?? 0} larvae outlined`} className="mx-auto max-h-[520px] w-auto" />
      </a>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Larvae detected" value={analysis.larvaeCount ?? "—"} big />
        <Stat label="Median length" value={mm(lengthMm.median)} big />
        <Stat label="Mean length" value={mm(lengthMm.mean)} />
        <Stat label="Range" value={lengthMm.min == null ? "—" : `${lengthMm.min.toFixed(1)}–${mm(lengthMm.max)}`} />
        <Stat label="Mean confidence" value={analysis.confidence == null ? "—" : `${Math.round(analysis.confidence * 100)}%`} />
        <Stat label="Processing" value={analysis.processingTimeMs == null ? "—" : `${(analysis.processingTimeMs / 1000).toFixed(1)} s`} />
        <Stat label="Model" value={analysis.modelVersion?.replace(/^roboflow:/, "") ?? "—"} small />
      </dl>

      {analysis.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
          {analysis.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {analysis.detections.length > 0 && (
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Per-larva measurements ({analysis.detections.length})</summary>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-sm tabular-nums">
              <thead className="sticky top-0 bg-surface text-xs text-muted">
                <tr>
                  <th className="px-3 py-1.5 font-medium">#</th>
                  <th className="px-3 py-1.5 font-medium">Length</th>
                  <th className="px-3 py-1.5 font-medium">Width</th>
                  <th className="px-3 py-1.5 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {analysis.detections.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-3 py-1">{d.id}</td>
                    <td className="px-3 py-1">{d.lengthMm != null ? mm(d.lengthMm) : d.lengthPx != null ? `${d.lengthPx.toFixed(0)} px` : "—"}</td>
                    <td className="px-3 py-1">{d.widthMm != null ? mm(d.widthMm) : d.widthPx != null ? `${d.widthPx.toFixed(0)} px` : "—"}</td>
                    <td className="px-3 py-1">{Math.round(d.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, big, small }: { label: string; value: React.ReactNode; big?: boolean; small?: boolean }) {
  return (
    <div className="rounded-lg bg-background px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 font-semibold tabular-nums ${big ? "text-2xl" : small ? "truncate text-xs" : "text-base"}`}>{value}</dd>
    </div>
  );
}
