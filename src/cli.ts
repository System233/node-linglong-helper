// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { program } from "commander";
import { command as createCommand } from "./create.js";
import { convertCommand } from "./convert.js";
import { updateCommand } from "./update.js";
program
  .addCommand(createCommand)
  .addCommand(convertCommand)
  .addCommand(updateCommand)
  .parse();
