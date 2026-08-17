import { getDocumentProxy, extractText } from "unpdf";
import mammoth from "mammoth";

export const MAX_SCRIPT_FILE_BYTES = 5 * 1024 * 1024;
const MIN_SCRIPT_TEXT_LENGTH = 40;

export async function extractScriptText(file: File): Promise<string> {
  if (file.size === 0) {
    throw new Error("The uploaded file is empty.");
  }
  if (file.size > MAX_SCRIPT_FILE_BYTES) {
    throw new Error("Script files must be under 5MB.");
  }

  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  let text: string;
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    text = (await extractText(pdf, { mergePages: true })).text;
  } else if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    text = (await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).value;
  } else if (
    name.endsWith(".txt") ||
    name.endsWith(".fountain") ||
    file.type.startsWith("text/") ||
    file.type === ""
  ) {
    text = new TextDecoder("utf-8").decode(buffer);
  } else {
    throw new Error(
      "Unsupported file type. Upload a .txt, .fountain, .pdf, or .docx file, or paste your script text instead.",
    );
  }

  const trimmed = text.trim();
  if (trimmed.length < MIN_SCRIPT_TEXT_LENGTH) {
    throw new Error(
      "Couldn't find enough readable text in this file. If it's a scanned PDF (images only, no text layer), paste the script text directly instead.",
    );
  }
  return trimmed;
}
