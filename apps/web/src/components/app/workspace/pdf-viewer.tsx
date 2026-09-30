"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { PdfFrame, ViewerHeader } from "./source-viewer";

/*
 * The user's PDF rendered with pdf.js, one page at a time, following the workspace's page
 * (anchor chips, `?p=` links, the page buttons). pdf.js and its worker load only when a PDF is
 * shown. If pdf.js can't open the file (old browser, storage CORS, a broken file) this falls back
 * to the browser's built-in viewer in an iframe.
 */

type PdfJs = typeof import("pdfjs-dist");

let pdfjs: Promise<PdfJs> | null = null;

/** The legacy build runs on older Safari too; the worker is a module worker the bundler emits. */
function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= import("pdfjs-dist/legacy/build/pdf.mjs")
    .then((m: PdfJs) => {
      if (!m.GlobalWorkerOptions.workerPort) {
        m.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
      }
      return m;
    })
    .catch((e: unknown) => {
      pdfjs = null;
      throw e;
    });
  return pdfjs;
}

type Props = { src: string; page: number; total: number; label: string; flash: number; onPage: (n: number) => void };

export function PdfViewer(props: Props) {
  const [failed, setFailed] = useState(false);
  return failed ? <PdfFrame {...props} /> : <PdfCanvas {...props} onFail={() => setFailed(true)} />;
}

function PdfCanvas({ src, page, total, label, flash, onPage, onFail }: Props & { onFail: () => void }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [rendering, setRendering] = useState(true);
  const [width, setWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fail = useRef(onFail);

  useEffect(() => {
    fail.current = onFail;
  });

  // Open the document once per URL. The signed URL is only needed for this one download.
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => Promise<void>) | null = null;
    loadPdfJs()
      .then((m) => {
        if (cancelled) return;
        const base = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${m.version}`;
        const task = m.getDocument({
          url: src,
          // One plain GET: range requests need extra CORS headers the storage bucket may not send.
          disableRange: true,
          cMapUrl: `${base}/cmaps/`,
          standardFontDataUrl: `${base}/standard_fonts/`,
          wasmUrl: `${base}/wasm/`,
          enableXfa: false,
        });
        destroy = () => task.destroy();
        return task.promise.then((d) => {
          if (!cancelled) setDoc(d);
        });
      })
      .catch(() => {
        if (!cancelled) fail.current();
      });
    return () => {
      cancelled = true;
      // Destroying the loading task also destroys the document and frees the worker's copy.
      void destroy?.();
    };
  }, [src]);

  // Fit the page to the column.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e?.contentRect.width ?? 0);
      if (w > 0) setWidth((prev) => (Math.abs(prev - w) > 4 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pages = doc?.numPages ?? total;
  const current = Math.min(Math.max(1, page), Math.max(1, pages));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!doc || !canvas || !width) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    setRendering(true);
    doc
      .getPage(current)
      .then((p) => {
        if (cancelled) return;
        const base = p.getViewport({ scale: 1 });
        const scale = width / base.width;
        // Sharp on retina without huge canvases on big pages.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = p.getViewport({ scale: scale * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        task = p.render({ canvas, viewport });
        return task.promise.then(() => {
          if (!cancelled) setRendering(false);
        });
      })
      .catch((e: unknown) => {
        if (cancelled || (e instanceof Error && e.name === "RenderingCancelledException")) return;
        fail.current();
      });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, current, width, flash]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-panel">
      <ViewerHeader label={label} page={current} total={pages} onPage={onPage} href={src} />
      <div className="max-h-[min(78vh,720px)] overflow-y-auto p-3 sm:p-4">
        <div ref={boxRef} className="relative w-full">
          {!doc && (
            <div className="grid aspect-[1/1.3] w-full place-items-center rounded-md bg-card" aria-busy="true" aria-label="Loading the PDF">
              <Loader2 className="spin size-5 text-muted" />
            </div>
          )}
          <div key={`${current}-${flash}`} className={doc ? "page-flash mx-auto w-fit overflow-hidden rounded-md bg-card" : "hidden"}>
            <canvas ref={canvasRef} role="img" aria-label={`${label}, page ${current} of ${pages}`} className="block" />
          </div>
          {doc && rendering && (
            <span className="pointer-events-none absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-card/90 shadow" aria-hidden>
              <Loader2 className="spin size-3.5 text-muted" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
