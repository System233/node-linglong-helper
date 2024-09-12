// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Command } from "commander";
import http, { IncomingMessage, ServerResponse } from "node:http";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import { inspect } from "node:util";
import sharp from "sharp";
export interface CLIServeOption {
  port: number;
  listen: string;
}
interface Handler {
  path: string;
  method: string;
  desc: string;
  handle: (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ) => Promise<void> | void;
}
const routes: Handler[] = [];

routes.push({
  method: "POST",
  path: "/sharp",
  desc: "裁剪图片,wget --method=POST --body-file=path/to/file http://localhost:3000/sharp/{WIDTH}x{HEIGHT} -O target.png",
  async handle(req, res) {
    const match = /\/sharp\/(\d+)x(\d+)/.exec(req.url);
    if (!match) {
      res.writeHead(400).end();
      return;
    }
    const [, width, height] = match;
    const passthrough = new PassThrough();
    const errorHandler = (error: Error) => {
      if (res.headersSent) {
        res.writeHead(400, "BadRequest", {
          "content-type": "text/plain;charset=utf8",
        });
        res.write(inspect(error));
      }
    };
    passthrough.once("data", () => {
      res.writeHead(200, "OK", { "content-type": "image/png" });
      passthrough.off("error", errorHandler);
    });
    passthrough.once("error", errorHandler);
    const transform = sharp().resize({ width: +width, height: +height }).png();
    await pipeline(req, transform, passthrough, res);
  },
});

export const serve = async (opt: CLIServeOption) => {
  const server = http.createServer();
  server.on("request", async (req, res) => {
    try {
      console.log(req.method, req.url);
      for (const item of routes) {
        if (req.url.startsWith(item.path) && item.method == req.method) {
          await item.handle(req, res);
          return;
        }
      }
      res.writeHead(404, "Not Found", {
        "content-type": "text/plain;charset=utf8",
      });
      res.write(
        `支持的操作:${routes
          .map((item) => `${item.method} ${item.path}:${item.desc}`)
          .join("\n")}`
      );
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500, "ISE");
        res.write(inspect(error));
      }
      console.error(error);
    } finally {
      res.end();
    }
  });
  server.on("error", (error) => console.error(error));
  server.listen(opt.port, opt.listen, () => {
    console.log(`Server running at http://${opt.listen}:${opt.port}`);
  });
};
export const serveCommand = new Command("serve")
  .description(`启动图标裁剪服务`)
  .option("-p,--port <INT>", "端口号", parseInt, 3000)
  .option("-l,--listen <ADDR>", "监听地址", "localhost")
  .action(serve);
