import sharp from "sharp";

await sharp("src/ogp-image.svg")
  .png()
  .flatten({ background: "white" })
  .toFile("public/ogp-image.png");
