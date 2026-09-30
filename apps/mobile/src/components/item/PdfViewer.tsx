import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Directory, File, Paths } from "expo-file-system";
import { Body, Button, Icon, Mono, PressableScale, ProgressBar, Small } from "@/components/ui";
import { palette } from "@/theme";

/**
 * The original PDF, drawn by pdf.js in a web view, on iOS and Android alike (Android's web view
 * can't show PDFs itself, and a native PDF module would mean another native dependency).
 *
 * - The file is downloaded natively into the cache (once per item), because the signed R2 URL has
 *   no CORS headers for a web view to fetch it; its bytes are handed to pdf.js as base64.
 * - The page is loaded with pdf.js's CDN folder as its base URL, so pdf.js and its worker load
 *   same-origin. Nothing but the pdf.js code comes from the network; the PDF never leaves the device.
 * - Pages render lazily near the viewport (and are dropped far from it) to keep memory flat on long
 *   documents; the web view reports the page in view, and `goTo` scrolls to a page (anchors).
 */

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/";
/** Base64 over the bridge gets slow past this; bigger files open in the browser instead. */
const MAX_BYTES = 60 * 1024 * 1024;

const HTML = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
<style>
  html, body { margin: 0; background: ${palette.panel}; -webkit-tap-highlight-color: transparent; }
  #pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 14px 0 84px; }
  .page { position: relative; background: #fff; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(42,14,12,.18); transition: box-shadow .3s; }
  .page canvas { display: block; width: 100%; height: 100%; }
  .page.flash { box-shadow: 0 0 0 3px ${palette.red500}; }
</style>
</head><body>
<div id="pages"></div>
<script type="module">
  import * as pdfjs from "./legacy/build/pdf.min.mjs";
  pdfjs.GlobalWorkerOptions.workerSrc = "./legacy/build/pdf.worker.min.mjs";
  const post = (m) => window.ReactNativeWebView.postMessage(JSON.stringify(m));
  const root = document.getElementById("pages");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let doc = null, pages = [], shown = 0;
  const drawn = new Map();

  async function draw(div) {
    const n = +div.dataset.n;
    if (drawn.has(n)) return;
    const task = { cancelled: false };
    drawn.set(n, task);
    const page = await doc.getPage(n);
    if (task.cancelled) return;
    const base = page.getViewport({ scale: 1 });
    const scale = div.clientWidth / base.width;
    div.style.height = base.height * scale + "px";
    const vp = page.getViewport({ scale: scale * dpr });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    div.appendChild(canvas);
    task.render = page.render({ canvasContext: canvas.getContext("2d"), viewport: vp });
    try { await task.render.promise; } catch (e) {}
  }
  function drop(div) {
    const n = +div.dataset.n;
    const task = drawn.get(n);
    if (!task) return;
    task.cancelled = true;
    if (task.render) task.render.cancel();
    drawn.delete(n);
    div.replaceChildren();
  }
  // Draw pages within about a screen of the viewport; free the canvases of the rest.
  const near = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? draw(e.target) : drop(e.target);
  }, { rootMargin: "120% 0px" });

  function report() {
    const mid = window.scrollY + window.innerHeight / 2;
    let n = 1;
    for (const div of pages) { if (div.offsetTop <= mid) n = +div.dataset.n; else break; }
    if (n !== shown) { shown = n; post({ type: "page", page: n }); }
  }
  let queued = false;
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; report(); });
  }, { passive: true });

  window.__goTo = (n, smooth) => {
    const div = pages[Math.max(1, Math.min(n, pages.length)) - 1];
    if (!div) return;
    window.scrollTo({ top: div.offsetTop - 14, behavior: smooth ? "smooth" : "auto" });
    div.classList.add("flash");
    setTimeout(() => div.classList.remove("flash"), 1200);
  };

  window.__open = async (b64, start) => {
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      doc = await pdfjs.getDocument({
        data: bytes,
        isEvalSupported: false,
        cMapUrl: "${PDFJS}cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "${PDFJS}standard_fonts/",
      }).promise;
      const first = (await doc.getPage(1)).getViewport({ scale: 1 });
      const width = Math.min(document.documentElement.clientWidth - 24, 900);
      for (let n = 1; n <= doc.numPages; n++) {
        const div = document.createElement("div");
        div.className = "page";
        div.dataset.n = String(n);
        div.style.width = width + "px";
        // Every page starts at page 1's shape; each takes its own when drawn.
        div.style.height = (width * first.height) / first.width + "px";
        root.appendChild(div);
        pages.push(div);
        near.observe(div);
      }
      post({ type: "loaded", pages: doc.numPages });
      if (start > 1) requestAnimationFrame(() => window.__goTo(start, false));
      report();
    } catch (e) {
      post({ type: "error", message: String((e && e.message) || e) });
    }
  };
  post({ type: "ready" });
</script>
</body></html>`;

type Msg = { type: "ready" } | { type: "loaded"; pages: number } | { type: "page"; page: number } | { type: "error"; message: string };

export type PdfHandle = { goTo: (page: number) => void };

type Props = {
  itemId: string;
  /** The signed URL of the upload (only needed until it's in the cache). */
  url: string | null;
  /** Page to open at, from a tapped page anchor or a ?p= deep link. */
  initialPage?: number | null;
  onOpenOriginal?: () => void;
  onShowText?: () => void;
  ref?: Ref<PdfHandle>;
};

type State = { kind: "downloading"; progress: number } | { kind: "opening" } | { kind: "ready"; pages: number } | { kind: "error"; message: string; tooBig?: boolean };

const cached = (itemId: string) => new File(Paths.cache, "pdf", `${itemId}.pdf`);

export function PdfViewer({ itemId, url, initialPage, onOpenOriginal, onShowText, ref }: Props) {
  const web = useRef<WebView>(null);
  const [state, setState] = useState<State>({ kind: "downloading", progress: 0 });
  const [page, setPage] = useState(initialPage ?? 1);
  const [attempt, setAttempt] = useState(0);
  // The web view and the file get ready in either order; open once both are.
  const webReady = useRef(false);
  const data = useRef<string | null>(null);
  const start = useRef(initialPage ?? 1);
  // Read when the download starts, not a reason to start another one.
  const urlRef = useRef(url);
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const open = useCallback(() => {
    if (!webReady.current || data.current === null) return;
    web.current?.injectJavaScript(`window.__open(${JSON.stringify(data.current)}, ${start.current}); true;`);
    data.current = null;
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const file = cached(itemId);
        if (!file.exists) {
          const src = urlRef.current;
          if (!src) throw new Error("The original file isn't available.");
          const dir = new Directory(Paths.cache, "pdf");
          if (!dir.exists) dir.create({ intermediates: true });
          await File.downloadFileAsync(src, file, {
            idempotent: true,
            onProgress: ({ bytesWritten, totalBytes }) => {
              if (live && totalBytes > 0) setState({ kind: "downloading", progress: bytesWritten / totalBytes });
            },
          });
        }
        if (file.size > MAX_BYTES) {
          if (live) setState({ kind: "error", message: "This PDF is too big to preview here.", tooBig: true });
          return;
        }
        const b64 = await file.base64();
        if (!live) return;
        setState({ kind: "opening" });
        data.current = b64;
        open();
      } catch {
        // A half-written file would fail the same way next time.
        try {
          const f = cached(itemId);
          if (f.exists) f.delete();
        } catch {}
        if (live) setState({ kind: "error", message: "Couldn't load the PDF. Check your connection and try again." });
      }
    })();
    return () => {
      live = false;
    };
  }, [itemId, attempt, open]);

  const goTo = useCallback((n: number, smooth = true) => {
    start.current = n;
    setPage(n);
    web.current?.injectJavaScript(`window.__goTo && window.__goTo(${Math.round(n)}, ${smooth}); true;`);
  }, []);
  useImperativeHandle(ref, () => ({ goTo: (n) => goTo(n) }), [goTo]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: Msg;
    try {
      m = JSON.parse(e.nativeEvent.data) as Msg;
    } catch {
      return;
    }
    if (m.type === "ready") {
      webReady.current = true;
      open();
    } else if (m.type === "loaded") setState({ kind: "ready", pages: m.pages });
    else if (m.type === "page") setPage(m.page);
    else setState({ kind: "error", message: "This PDF couldn't be displayed." });
  };

  const retry = () => {
    webReady.current = false;
    data.current = null;
    setState({ kind: "downloading", progress: 0 });
    setAttempt((a) => a + 1);
  };

  const pages = state.kind === "ready" ? state.pages : 0;

  return (
    <View style={{ flex: 1, backgroundColor: palette.panel }}>
      <WebView
        key={attempt}
        ref={web}
        source={{ html: HTML, baseUrl: PDFJS }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        // Only the viewer page itself; nothing inside it should navigate away.
        onShouldStartLoadWithRequest={(r) => r.url.startsWith(PDFJS) || r.url.startsWith("about:")}
        onContentProcessDidTerminate={retry}
        onRenderProcessGone={retry}
        style={{ flex: 1, backgroundColor: palette.panel }}
        setDisplayZoomControls={false}
      />

      {state.kind !== "ready" ? (
        // Covers the web view until the document is drawn (hiding it with opacity misbehaves on Android).
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {state.kind === "error" ? (
            <>
              <Icon name="pdf" size={26} color={palette.muted} />
              <Body style={{ textAlign: "center", marginTop: 10 }}>{state.message}</Body>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                {state.tooBig ? null : (
                  <Button size="sm" variant="ink" leadingIcon="refresh" onPress={retry}>
                    Try again
                  </Button>
                )}
                {onOpenOriginal ? (
                  <Button size="sm" variant="ghost" icon="arrowUpRight" onPress={onOpenOriginal}>
                    Open original
                  </Button>
                ) : null}
                {onShowText ? (
                  <Button size="sm" variant="ghost" onPress={onShowText}>
                    Show text
                  </Button>
                ) : null}
              </View>
            </>
          ) : (
            <View style={{ width: 200, alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={palette.red500} />
              <Small>{state.kind === "downloading" ? "Downloading the PDF…" : "Opening…"}</Small>
              {state.kind === "downloading" && state.progress > 0 ? <ProgressBar value={state.progress} height={4} /> : null}
            </View>
          )}
        </View>
      ) : null}

      {pages > 1 ? (
        <View style={styles.nav} pointerEvents="box-none">
          <View style={styles.pill}>
            <PressableScale onPress={() => goTo(Math.max(1, page - 1))} disabled={page <= 1} haptics="select" hitSlop={8} accessibilityLabel="Previous page" style={styles.step}>
              <Icon name="back" size={13} color={palette.cream} weight="semibold" />
            </PressableScale>
            <Mono style={{ color: palette.cream, fontSize: 12, minWidth: 74, textAlign: "center" }}>
              {page} / {pages}
            </Mono>
            <PressableScale onPress={() => goTo(Math.min(pages, page + 1))} disabled={page >= pages} haptics="select" hitSlop={8} accessibilityLabel="Next page" style={styles.step}>
              <Icon name="forward" size={13} color={palette.cream} weight="semibold" />
            </PressableScale>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, backgroundColor: palette.panel },
  nav: { position: "absolute", left: 0, right: 0, bottom: 14, alignItems: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4, borderRadius: 999, backgroundColor: "rgba(22,18,18,0.86)" },
  step: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
});
