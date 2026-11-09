/**
 * Extracts raw text from an uploaded CV file. Supports PDF and DOCX, the
 * two formats the brief calls for. Never throws: a file we can't read
 * (corrupt, password-protected, an unsupported type, a bad scan) comes
 * back as an empty string, which the scoring engine then flags as
 * "low confidence" rather than silently mis-scoring it.
 *
 * pdf-parse/mammoth are imported dynamically, inside the function, not
 * at module load time. This file is imported from actions.ts alongside
 * every other Server Action (login included), and pdfjs-dist has
 * import-time side effects (it probes for an optional native canvas
 * package and sets up DOM polyfills) that threw in Vercel's serverless
 * runtime — breaking login and every other action, not just uploads.
 * Loading it lazily means that cost is only ever paid when a PDF is
 * actually being parsed.
 */
export async function extractResumeText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith(".pdf")) {
      // pdfjs-dist (which pdf-parse wraps) expects browser globals like
      // DOMMatrix to exist even for plain text extraction with no
      // rendering. Node has no native canvas in this serverless runtime,
      // so stub just enough to get past its environment check.
      if (typeof (globalThis as Record<string, unknown>).DOMMatrix === "undefined") {
        (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrixPolyfill {};
      }
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text ?? "";
    }
    if (name.endsWith(".docx")) {
      const { default: mammoth } = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? "";
    }
    // .doc (legacy binary Word) and anything else: not supported for
    // extraction, but we still create the candidate record so the
    // recruiter can see it was uploaded and needs a manual look.
    return "";
  } catch (error) {
    console.error("extractResumeText failed for", file.name, error);
    return "";
  }
}

export function isSupportedResumeFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".docx");
}
