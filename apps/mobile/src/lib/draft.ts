import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { UPLOAD_LIMITS, SUPPORTED_UPLOADS, type CreateSourceRequest, type CreateSourceResponse, type LibraryItem, type SourceKind } from "@a2n/shared";
import { api, uploadFile, type LocalFile } from "./api";

/**
 * The source being added, held here between the Add tab and the progress screen (a pasted text
 * or a file is too big for route params). Only one is in flight at a time.
 */
export type Draft =
  | { type: "upload"; file: LocalFile; kind: SourceKind; recording?: boolean }
  | { type: "text"; text: string }
  | { type: "url"; url: string };

let current: Draft | null = null;
export const setDraft = (d: Draft) => {
  current = d;
};
export const getDraft = () => current;

export const draftKind = (d: Draft): SourceKind => (d.type === "upload" ? d.kind : d.type === "text" ? "text" : "web");

const MEDIA: SourceKind[] = ["audio", "video", "recording"];
const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

/** Upload (if needed) and create the item. Resolves to the queued item; processing runs server-side. */
export async function submitDraft(
  draft: Draft,
  opts: Pick<CreateSourceRequest, "noteType" | "outputs" | "language">,
  onUpload?: (fraction: number) => void,
): Promise<LibraryItem> {
  let source: CreateSourceRequest["source"];
  if (draft.type === "upload") source = { type: "upload", uploadId: await uploadFile(draft.file, onUpload), recording: draft.recording || undefined };
  else if (draft.type === "text") source = { type: "text", text: draft.text };
  else source = { type: "url", url: draft.url };
  const { item } = await api<CreateSourceResponse>("POST", "/sources", { source, ...opts } satisfies CreateSourceRequest);
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
  if (MEDIA.includes(kind) && file.size > UPLOAD_LIMITS.maxMediaBytes)
    throw new Error(`Audio and video files over ${mb(UPLOAD_LIMITS.maxMediaBytes)} aren't supported yet. This one is ${mb(file.size)}.`);
  if (file.size > UPLOAD_LIMITS.maxUploadBytes) throw new Error(`Files can be up to ${mb(UPLOAD_LIMITS.maxUploadBytes)}.`);
  return { type: "upload", file, kind };
}

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
  const ext = a.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = a.mimeType && a.mimeType !== "application/octet-stream" ? a.mimeType : (BY_EXTENSION[ext] ?? "application/octet-stream");
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

export const isYouTube = (url: string) => {
  try {
    return /(^|\.)(youtube\.com|youtu\.be)$/.test(new URL(url).hostname);
  } catch {
    return /youtu\.?be/.test(url);
  }
};

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
