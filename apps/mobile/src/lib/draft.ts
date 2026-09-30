import { useSyncExternalStore } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import {
  UPLOAD_LIMITS,
  SUPPORTED_UPLOADS,
  youtubeIdOf,
  type CreateSourceRequest,
  type CreateSourceResponse,
  type LibraryItem,
  type NoteTypeKey,
  type OutputKey,
  type SourceKind,
} from "@a2n/shared";
import { api, uploadFile, type LocalFile, type UploadSession } from "./api";
import { readJson, removeKey, writeJson } from "./storage";

/**
 * The source being added, held here between the Add tab and the progress screen (a pasted text
 * or a file is too big for route params). Only one is in flight at a time.
 */
export type Draft =
  | { type: "upload"; file: LocalFile; kind: SourceKind; recording?: boolean }
  | { type: "text"; text: string }
  /** A web page or a YouTube video: both go up as a link and the API tells them apart. */
  | { type: "url"; url: string };

/** What the user chose for the item on the note-type and outputs screens. */
export type DraftOptions = {
  noteType: NoteTypeKey | "auto";
  /** Omitted for auto-detect: the API makes the detected type's defaults */
  outputs?: OutputKey[];
  /** Output language; "auto" = same as the source */
  language: string;
  instructions?: string;
};

/**
 * The draft with everything around it. It's saved on the device, so an app restart (or an
 * upload cut off halfway) comes back to the same place instead of losing the recording.
 */
export type PendingDraft = {
  draft: Draft;
  /** The flow's title: file name, site, "Pasted text · 120 words"… */
  label: string;
  options?: DraftOptions;
  /** How far the upload got, to resume it */
  upload?: UploadSession | null;
  savedAt: number;
};

const DRAFT_KEY = "anything2note_draft";
/** Files shared in from other apps are copied here, so they outlive the share sheet's copy. */
const sharedDir = () => new Directory(Paths.cache, "shared");

let current: PendingDraft | null | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
/** The submission running in this session, if any: leaving the progress screen doesn't stop it. */
let inflight: Promise<LibraryItem> | null = null;
let inflightDraft: Draft | null = null;
let uploadListener: ((fraction: number) => void) | undefined;

/** A saved draft whose file has gone (the OS cleared the cache) can't be finished, so it's dropped. */
function load(): PendingDraft | null {
  const saved = readJson<PendingDraft>(DRAFT_KEY);
  if (!saved?.draft) return null;
  if (saved.draft.type === "upload" && !new File(saved.draft.file.uri).exists) {
    removeKey(DRAFT_KEY);
    return null;
  }
  return saved;
}

function commit(next: PendingDraft | null) {
  current = next;
  if (next) writeJson(DRAFT_KEY, next);
  else removeKey(DRAFT_KEY);
  emit();
}

/** Deletes a file only if it's one of our own copies of a shared file. */
function dropOwnedFile(d: PendingDraft | null | undefined) {
  if (d?.draft.type !== "upload") return;
  const f = new File(d.draft.file.uri);
  try {
    if (f.uri.startsWith(sharedDir().uri) && f.exists) f.delete();
  } catch {}
}

export function getPending(): PendingDraft | null {
  if (current === undefined) current = load();
  return current;
}

export const getDraft = (): Draft | null => getPending()?.draft ?? null;

/** Starts a new draft, replacing any unfinished one. */
export function setDraft(draft: Draft, label: string) {
  const prev = getPending();
  if (prev && (prev.draft.type !== "upload" || draft.type !== "upload" || prev.draft.file.uri !== draft.file.uri)) dropOwnedFile(prev);
  commit({ draft, label, savedAt: Date.now() });
}

export function setDraftOptions(options: DraftOptions) {
  const d = getPending();
  if (d) commit({ ...d, options, savedAt: Date.now() });
}

/** Saves upload progress onto `draft`, unless something else has become the draft since. */
function setUpload(draft: Draft, upload: UploadSession | null) {
  const d = getPending();
  if (d && d.draft === draft) commit({ ...d, upload });
}

export function clearDraft() {
  dropOwnedFile(getPending());
  commit(null);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The draft in progress (or saved from an earlier session), re-rendering when it changes. */
export const usePendingDraft = () => useSyncExternalStore(subscribe, getPending, getPending);

const isSubmitting = () => inflight !== null && inflightDraft === getPending()?.draft;
/** Whether the draft is being uploaded / created right now (possibly with no screen watching). */
export const useDraftSubmitting = () => useSyncExternalStore(subscribe, isSubmitting, isSubmitting);

export const draftKind = (d: Draft): SourceKind =>
  d.type === "upload" ? d.kind : d.type === "text" ? "text" : youtubeIdOf(d.url) ? "youtube" : "web";

const MEDIA: SourceKind[] = ["audio", "video", "recording"];
const mb = (bytes: number) => (bytes >= 1024 ** 3 ? `${Math.round(bytes / 1024 ** 3)} GB` : `${Math.round(bytes / 1024 / 1024)} MB`);

/**
 * Uploads (resuming where an earlier attempt stopped) and creates the item, with the options
 * saved by the outputs screen. Resolves to the queued item and clears the draft; processing runs
 * server-side.
 */
export function submitDraft(onUpload?: (fraction: number) => void): Promise<LibraryItem> {
  // A second screen asking (the flow reopened mid-upload) follows the same submission.
  uploadListener = onUpload;
  const draft = getPending()?.draft ?? null;
  if (inflight && inflightDraft === draft) return inflight;
  inflightDraft = draft;
  const run = send().finally(() => {
    if (inflight === run) {
      inflight = null;
      inflightDraft = null;
    }
    emit();
  });
  inflight = run;
  emit();
  return inflight;
}

async function send(): Promise<LibraryItem> {
  const pending = getPending();
  if (!pending) throw new Error("There's nothing to add. Go back and pick a source again.");
  const { draft, options } = pending;
  let source: CreateSourceRequest["source"];
  if (draft.type === "upload") {
    const uploadId = await uploadFile(draft.file, {
      session: pending.upload,
      onSession: (u) => setUpload(draft, u),
      onProgress: (f) => {
        if (inflightDraft === draft) uploadListener?.(f);
      },
    });
    source = { type: "upload", uploadId, recording: draft.recording || undefined };
  } else if (draft.type === "text") source = { type: "text", text: draft.text };
  else source = { type: "url", url: draft.url };
  const instructions = options?.instructions?.trim();
  const body: CreateSourceRequest = {
    source,
    noteType: options?.noteType ?? "auto",
    outputs: options?.noteType === "auto" ? undefined : options?.outputs,
    language: options?.language,
    instructions: instructions || undefined,
  };
  const { item } = await api<CreateSourceResponse>("POST", "/sources", body);
  if (getPending()?.draft === draft) clearDraft();
  return item;
}

/* ───────────── Picking files ───────────── */

/** Used when the picker doesn't report a MIME type. */
const BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const HEIC = ["image/heic", "image/heif"];

function kindOf(mime: string): SourceKind | null {
  for (const [kind, types] of Object.entries(SUPPORTED_UPLOADS)) if (types.includes(mime)) return kind as SourceKind;
  return null;
}

const sizeOf = (uri: string, reported?: number | null) => reported ?? new File(uri).size ?? 0;

/** Checks a file against what the API accepts, so the user hears "no" before a long upload. */
function checked(file: LocalFile): Draft {
  const kind = kindOf(file.mimeType);
  if (!kind) throw new Error("That file type isn't supported yet. Try PDF, Word, PowerPoint, an image, or audio/video.");
  if (MEDIA.includes(kind)) {
    if (file.size > UPLOAD_LIMITS.maxMediaBytes)
      throw new Error(`Audio and video files over ${mb(UPLOAD_LIMITS.maxMediaBytes)} aren't supported yet. This one is ${mb(file.size)}.`);
  } else if (file.size > UPLOAD_LIMITS.maxUploadBytes) throw new Error(`Documents and images can be up to ${mb(UPLOAD_LIMITS.maxUploadBytes)}. This one is ${mb(file.size)}.`);
  return { type: "upload", file, kind };
}

/** The MIME type to trust: the reported one, or the file extension's when it's missing or generic. */
const mimeOf = (name: string, reported?: string | null) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return reported && reported !== "application/octet-stream" ? reported : (BY_EXTENSION[ext] ?? "application/octet-stream");
};

/** Re-encodes any image (HEIC from the camera roll included) as a JPEG the API can read. */
async function toJpeg(uri: string, name: string): Promise<LocalFile> {
  let image = await ImageManipulator.manipulate(uri).renderAsync();
  // A long edge beyond ~2400px adds upload time without helping text extraction.
  if (Math.max(image.width, image.height) > 2400) {
    const scale = 2400 / Math.max(image.width, image.height);
    image = await ImageManipulator.manipulate(image).resize({ width: Math.round(image.width * scale) }).renderAsync();
  }
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return { uri: out.uri, name: name.replace(/\.[^.]+$/, "") + ".jpg", mimeType: "image/jpeg", size: sizeOf(out.uri) };
}

/** Files app / Drive / downloads. Null when cancelled; throws with a user-facing message if unusable. */
export async function pickDocument(): Promise<Draft | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: [...Object.values(SUPPORTED_UPLOADS).flat(), ...HEIC], copyToCacheDirectory: true });
  const a = res.assets?.[0];
  if (res.canceled || !a) return null;
  const mimeType = mimeOf(a.name, a.mimeType);
  if (HEIC.includes(mimeType)) return checked(await toJpeg(a.uri, a.name));
  return checked({ uri: a.uri, name: a.name, mimeType, size: sizeOf(a.uri, a.size) });
}

/** Camera or photo library → always a JPEG. Null when cancelled or camera access was refused. */
export async function pickPhoto(from: "camera" | "library"): Promise<Draft | null> {
  if (from === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Camera access is off. Turn it on in Settings to photograph pages and whiteboards.");
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: "images", quality: 1 };
  const res = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  const a = res.assets?.[0];
  if (res.canceled || !a) return null;
  return checked(await toJpeg(a.uri, a.fileName ?? `Photo ${new Date().toISOString().slice(0, 10)}`));
}

/** A finished in-app recording (AAC in .m4a). */
export function recordingDraft(uri: string): Draft {
  const name = `Recording ${new Date().toISOString().slice(0, 16).replace("T", " ")}.m4a`;
  const draft = checked({ uri, name: name.replace(/:/g, "."), mimeType: "audio/mp4", size: sizeOf(uri) });
  return draft.type === "upload" ? { ...draft, kind: "recording", recording: true } : draft;
}

/**
 * A file shared in from another app. It's copied into our cache first: the share sheet's copy can
 * be cleared at any time, and the draft (saved across restarts) must still point at a real file.
 */
export async function sharedFileDraft(shared: { path: string; fileName?: string | null; mimeType?: string | null; size?: number | null }): Promise<Draft> {
  const name = shared.fileName || decodeURIComponent(shared.path.split("/").pop() ?? "") || "Shared file";
  const mimeType = mimeOf(name, shared.mimeType);
  if (HEIC.includes(mimeType)) return checked(await toJpeg(shared.path, name));
  const dir = sharedDir();
  dir.create({ intermediates: true, idempotent: true });
  const copy = new File(dir, `${Date.now()}-${name.replace(/[/\\]/g, "_")}`);
  await new File(shared.path).copy(copy);
  return checked({ uri: copy.uri, name, mimeType, size: sizeOf(copy.uri, shared.size) });
}

/** Adds https:// when someone pastes "example.com/page". Null if it still isn't a web address. */
export function normaliseUrl(input: string): string | null {
  const v = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}
