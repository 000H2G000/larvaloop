"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ImageAnalysis, ImageRecord, ImageSource } from "@/types/api";
import { Card } from "@/components/ui";
import { CameraCapture } from "./CameraCapture";
import { AnalysisView } from "./AnalysisView";
import { ImageHistory } from "./ImageHistory";

const POLL_MS = 1000;
const POLL_TIMEOUT_MS = 120_000;

type Phase =
  | { kind: "idle" }
  | { kind: "busy"; step: "Uploading" | "Analysing" }
  | { kind: "error"; message: string };

const message = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function VisionWorkbench() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [sampleSheet, setSampleSheet] = useState(true);
  const [history, setHistory] = useState<ImageRecord[]>([]);
  const [selected, setSelected] = useState<{ image: ImageRecord; analysis: ImageAnalysis | null } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  const loadHistory = useCallback(async () => {
    try {
      setHistory((await api.listImages(12)).data);
    } catch {
      // History is secondary; the health panel reports connectivity problems.
    }
  }, []);

  /** Keeps ?image=<id> in the URL so a result can be shared or reopened. */
  const rememberSelection = (imageId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("image", imageId);
    window.history.replaceState(null, "", url);
  };

  useEffect(() => {
    loadHistory();
    const linked = new URLSearchParams(window.location.search).get("image");
    if (linked) {
      api
        .getImage(linked)
        .then((image) => openFromHistory(image))
        .catch((err) => setPhase({ kind: "error", message: message(err) }));
    }
    // openFromHistory is stable in behaviour; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadHistory]);

  const pollAnalysis = async (imageId: string, run: number) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline && run === runId.current) {
      const analysis = await api.getAnalysis(imageId);
      if (analysis.status === "completed" || analysis.status === "failed") return analysis;
      await wait(POLL_MS);
    }
    return null;
  };

  const submit = async (file: Blob, captured: ImageSource, filename?: string) => {
    const run = ++runId.current;
    const source: ImageSource = sampleSheet ? "sample_dataset" : captured;
    try {
      setPhase({ kind: "busy", step: "Uploading" });
      const image = await api.uploadImage(file, { source, filename });
      setSelected({ image, analysis: null });
      rememberSelection(image._id);

      setPhase({ kind: "busy", step: "Analysing" });
      await api.analyzeImage(image._id);
      const analysis = await pollAnalysis(image._id, run);
      if (run !== runId.current) return;
      if (!analysis) throw new ApiError("Analysis is taking too long. Check the vision service.", 0, "TIMEOUT");
      if (analysis.status === "failed") throw new ApiError(analysis.error ?? "Analysis failed", 0, "ANALYSIS_FAILED");

      setSelected({ image: { ...image, analysisStatus: "completed" }, analysis });
      setPhase({ kind: "idle" });
    } catch (err) {
      if (run === runId.current) setPhase({ kind: "error", message: message(err) });
    } finally {
      loadHistory();
    }
  };

  const openFromHistory = async (image: ImageRecord) => {
    runId.current++;
    setPhase({ kind: "idle" });
    setSelected({ image, analysis: null });
    rememberSelection(image._id);
    if (image.analysisStatus === "none") return;
    try {
      setSelected({ image, analysis: await api.getAnalysis(image._id) });
    } catch (err) {
      setPhase({ kind: "error", message: message(err) });
    }
  };

  const busy = phase.kind === "busy";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card title="Capture">
          <CameraCapture disabled={busy} onCapture={(blob) => submit(blob, "camera", "camera.jpg")} />

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
            >
              Upload photo…
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) submit(f, "manual_upload", f.name);
                e.target.value = "";
              }}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sampleSheet} onChange={(e) => setSampleSheet(e.target.checked)} className="accent-[var(--accent)]" />
              Printed sample sheet
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">
            Keep the 20 mm black square in view for lengths in mm. Sample-sheet images are labelled so they are never mixed up with live tray data.
          </p>
        </Card>

        <Card title="Result">
          {phase.kind === "busy" && (
            <div className="flex items-center gap-3 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent" role="status">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              {phase.step}… {phase.step === "Analysing" && "usually 2–15 s"}
            </div>
          )}
          {phase.kind === "error" && (
            <div className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {phase.message}
            </div>
          )}
          {selected?.analysis ? (
            <div className={phase.kind === "idle" ? "" : "mt-4"}>
              <AnalysisView image={selected.image} analysis={selected.analysis} />
            </div>
          ) : (
            phase.kind === "idle" && (
              <p className="text-sm text-muted">
                {selected ? "This image has not been analysed." : "Capture a frame or upload a photo to count and measure larvae."}
              </p>
            )
          )}
        </Card>
      </div>

      <Card title="Recent images">
        <ImageHistory images={history} selectedId={selected?.image._id} onSelect={openFromHistory} />
      </Card>
    </div>
  );
}
