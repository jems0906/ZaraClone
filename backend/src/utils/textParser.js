let pdfParse;

function getPdfParser() {
  if (!pdfParse) {
    pdfParse = require("pdf-parse");
  }
  return pdfParse;
}

async function parseUploadedFile(file) {
  if (!file) {
    throw new Error("No file uploaded");
  }

  const mime = file.mimetype;

  if (mime === "application/pdf") {
    let parsed;
    try {
      parsed = await getPdfParser()(file.buffer);
    } catch (error) {
      throw new Error("PDF parsing is unavailable on this runtime. Upload a TXT file or use a Node 20/22 runtime.");
    }
    return parsed.text || "";
  }

  return file.buffer.toString("utf8");
}

module.exports = { parseUploadedFile };
