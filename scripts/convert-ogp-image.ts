import sharp from "sharp";

await sharp("src/ogp-image.svg")
  .png()
  .flatten({ background: "#f6f6f6" })
  .toFile("public/ogp-image.png");
