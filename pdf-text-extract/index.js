const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const fs = require("fs");

// Some PDFs need external cmaps.
const CMAP_URL = "./node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;

// Where the standard fonts are located.
const STANDARD_FONT_DATA_URL =
  "./node_modules/pdfjs-dist/standard_fonts/";

async function extractText(base64PDF){
    pdfBuffer = Buffer.from(base64PDF, "base64"); // Decode Base64 to Binary Buffer

    let loadingTask = pdfjsLib.getDocument({
        data:pdfBuffer,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        standardFontDataUrl: STANDARD_FONT_DATA_URL,
      });
  
    let pdfDocument = await loadingTask.promise;
    console.log("# PDF document loaded.");

    console.log(pdfDocument.numPages)

    let firstPage = await pdfDocument.getPage(1)

    let textContent = await firstPage.getTextContent()
    let pageTexts = ""

    textContent.items.forEach((item) =>{
        // console.log(item.str)
        pageTexts += item.str + (item.hasEOL ? "\n" : "")
    })

    return pageTexts
}

let base64pdf = fs.readFileSync("joinville.pdf", "base64")

extractText(base64pdf).then(
    (data) => {
        console.log(data)
    }
)
