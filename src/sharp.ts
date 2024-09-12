// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Command } from "commander";
import sharp from "sharp";
export interface CLISharpOption {
  input: string;
  size?: number;
  width?: number;
  height?: number;
  output: string;
}
export const sharpImage = async (input: string, opt: CLISharpOption) => {
  opt.input = input;
  const image = sharp(opt.input);
  if (opt.size) {
    image.resize({ width: opt.size, height: opt.size });
  } else if (opt.width || opt.height) {
    image.resize({
      width: opt.width ?? opt.height,
      height: opt.height ?? opt.width,
    });
  }
  //   image.png();
  await image.toFile(opt.output);
};
export const sharpCommand = new Command("sharp")
  .description(`裁剪图片`)
  .argument("input", "图片输入, 支持 JPEG, PNG, WebP, AVIF, GIF, SVG, TIFF")
  .option("-s,--size <INT>", "尺寸", parseInt)
  .option("-w,--width <INT>", "宽度", parseInt)
  .option("-h,--height <INT>", "高度", parseInt)
  .option("-o,--output <PATH>", "输出图片", "a.png")
  .action(sharpImage);
