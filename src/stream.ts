// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import { compress, decompress } from "@mongodb-js/zstd";
import { PassThrough, Transform } from "stream";
export const createZstStream = () => {
  const buffer: Buffer[] = [];
  return new Transform({
    transform(chunk, encoding, callback) {
      buffer.push(chunk);
      callback();
    },
    async final(callback) {
      try {
        this.push(await decompress(Buffer.concat(buffer)));
        callback();
      } catch (error: any) {
        callback(error);
      }
    },
  });
};
