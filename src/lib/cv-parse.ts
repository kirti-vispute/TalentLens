import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extracts raw text from an uploaded CV file. Supports PDF and DOCX, the
 * two formats the brief calls for. Never throws: a file we can't read
 * (corrupt, password-protected, an unsupported type, a bad scan) comes
 * back as an empty string, which the scoring engine then flags as
 * "low confidence" rather than silently mis-scoring it.
 */
export async function extractResumeText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text ?? "";
    }
    if (name.endsWith(".docx")) {
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
