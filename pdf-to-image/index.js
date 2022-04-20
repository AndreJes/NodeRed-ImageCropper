const Canvas = require("canvas");
const assert = require("assert").strict;
const fs = require("fs");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

function NodeCanvasFactory() {}
NodeCanvasFactory.prototype = {
  create: function NodeCanvasFactory_create(width, height) {
    assert(width > 0 && height > 0, "Invalid canvas size");
    const canvas = Canvas.createCanvas(width, height);
    const context = canvas.getContext("2d");
    
    context.imageSmoothingEnabled = false; // Don't blur images when trying to sharpen edges

    return {
      canvas,
      context,
    };
  },

  reset: function NodeCanvasFactory_reset(canvasAndContext, width, height) {
    assert(canvasAndContext.canvas, "Canvas is not specified");
    assert(width > 0 && height > 0, "Invalid canvas size");
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },

  destroy: function NodeCanvasFactory_destroy(canvasAndContext) {
    assert(canvasAndContext.canvas, "Canvas is not specified");

    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

// Some PDFs need external cmaps.
const CMAP_URL = "./node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;

// Where the standard fonts are located.
const STANDARD_FONT_DATA_URL =
  "./node_modules/pdfjs-dist/standard_fonts/";

// Load the PDF file.

/**
 * Receives a Base64 string of the desired PDF to convert into image and returns the image Buffer + Base64 string
 * @param {string} pdfBase64 PDF to convert Base64 string 
 * @param {number} scaleDPI The desired scale to convert, higher numbers equals higher quality images (highly increases the image file size)!
 * @param {"png"|"jpeg"} imageFormat Image format to be generated
 */
async function extractBufferAndBase64FromPDF (pdfBase64, desiredWidth=1240, imageFormat="png") {
  
  try {

    assert(typeof(pdfBase64) === 'string', `Invalid PDFBase64 type, expected string, but got: ${typeof(pdfBase64)}`);
    assert(typeof(desiredWidth) === 'number', `Invalid desiredWidth type, expected number, but got: ${typeof(scaleDPI)}`);
    assert(["png", "jpeg"].includes(imageFormat), `Invalid imageFormat, allowed values are ["png", "jpeg"], but got: ${typeof(imageFormat)}`);

    pdfBase64 = Buffer.from(pdfBase64, "base64") // Decode Base64 to Binary Buffer

    let loadingTask = pdfjsLib.getDocument({
      data:pdfBase64,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
    });

    let pdfDocument = await loadingTask.promise;
    console.log("# PDF document loaded.");

    // Get the first page.
    let page = await pdfDocument.getPage(1);

    let viewport = page.getViewport({ scale: 1 });
    
    let desiredScale = (desiredWidth / viewport.width) // Scale to width of 1240px

    viewport = page.getViewport({ scale: desiredScale }); // 

    let width = Math.floor(viewport.width)
    let height = Math.floor(viewport.height)

    let canvasFactory = new NodeCanvasFactory();
    let canvasAndContext = canvasFactory.create(
      width,
      height
    );

    let renderContext = {
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
      intent:""
    };

    let renderTask = page.render(renderContext);
    await renderTask.promise;

    let imageConfigs = "";
    // Convert the canvas to an image buffer.
    if(imageFormat == "png"){
       imageConfigs = {
        compressionLevel:4, 
        filters: canvasAndContext.canvas.PNG_FILTER_NONE
      };
    } else if (imageFormat == "jpeg") {
      imageConfigs = { 
        quality: 1,  
        chromaSubsampling: false
      };
    }

    let tempBuffer = canvasAndContext.canvas.toBuffer(`image/${imageFormat}`, config=imageConfigs)

    let imageData = {
      // Binary array of the image
      imageBuffer: tempBuffer,
      // Needs to replace the URL part to get only the base64 string
      imageBase64String: canvasAndContext.canvas.toDataURL().replace(`data:image/${imageFormat};base64,`, ""),
      // Aditional data that from the Image
      imageWidth: width,
      imageHeight: height
    };

    // Release page resources.
    page.cleanup();

    return imageData;
  } catch (reason) {
    throw reason
  }
}

module.exports = function(RED){
  function pdfToImage(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on('input', async function(msg) {

        let desiredWidth = msg.desiredWidth || 1240;
        let imageFormat = msg.imageFormat || "png";

        let convertedData = await extractBufferAndBase64FromPDF(msg.payload, desiredWidth, imageFormat);

        msg.imageData = convertedData;

        node.send(msg);
    });
  }
  RED.nodes.registerType("PDFtoImage", pdfToImage);
}

// extractBufferAndBase64FromPDF(BASE64, desiredWidth=1240, imageFormat="png").then((imageData) =>{

//   console.log("width: " + imageData.imageWidth);
//   console.log("height: " + imageData.imageHeight);

//   // Debug salva uma cópia da imagem e o base64
  
//   fs.writeFile(`output.${imageFormat}`, imageData.imageBuffer, function (error) {
//     if (error) {
//       console.error("Error: " + error);
//     } else {
//       console.log(
//         `output.${imageFormat} created`
//       );
//     }
//   });

//   fs.writeFile("base64.txt", imageData.imageBase64String, function (error) {
//     if (error) {
//       console.error("Error: " + error);
//     } else {
//       console.log(
//         "base64.txt created"
//       );
//     }
//   });
  
// }).catch((reason) => {
//   console.log(reason)
// });

