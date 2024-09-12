#!/usr/bin/env node
// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { program } from "commander";
import { command as createCommand } from "./create.js";
import { convertCommand } from "./convert.js";
import { updateCommand } from "./update.js";
import { patchCommand } from "./patch.js";
import { serveCommand } from "./serve.js";
import { sharpCommand } from "./sharp.js";
program
  .addCommand(createCommand)
  .addCommand(convertCommand)
  .addCommand(updateCommand)
  .addCommand(patchCommand)
  .addCommand(serveCommand)
  .addCommand(sharpCommand)
  .parse();
