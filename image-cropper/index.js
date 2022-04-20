const fs = require("fs");
const Canvas = require("canvas");

async function CropImage(imageDataURL, coord_x, coord_y, width, height) {
    let canvas = new Canvas.createCanvas(width, height);
    
    let defaultFormat = "image/png"

    let imageConfigs = {
      compressionLevel: 8, 
      filters: canvas.PNG_FILTER_NONE
    };

    let image = await Canvas.loadImage(imageDataURL);
    let ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "rgba(255, 255, 255, 1)";

    let drawStartX = 0
    let drawStartY = 0

    ctx.drawImage(image, coord_x, coord_y, width, height, drawStartX, drawStartY, width, height)

    let tempBuffer = canvas.toBuffer(defaultFormat, imageConfigs);

    let imageData = {
      // Binary array of the image
      imageBuffer: tempBuffer,
      // Needs to replace the URL part to get only the base64 string
      imageBase64String: canvas.toDataURL().replace(`data:${defaultFormat};base64,`, ""),
      // Aditional data that from the Image
      imageWidth: width,
      imageHeight: height
    };

    return imageData;
}

module.exports = function(RED) {
  function imageCropperNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on('input', async function(msg) {

      let dataURL = "data:image/png;base64," + msg.payload

      let coord_x = msg.coordinates.coord_x
      let coord_y = msg.coordinates.coord_y
      let width = msg.coordinates.width
      let height = msg.coordinates.height

      msg.crop = await CropImage(dataURL, coord_x, coord_y, width, height)

      node.send(msg);
    });
  }

  RED.nodes.registerType("imageCropper", imageCropperNode);
}