// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Command } from "commander";
import { install } from "./utils.js";
import { constants, writeFile } from "fs/promises";
import { INSTALL_PATCH_SCRIPT } from "./constant.js";

export const patch = async (patches: string[]) => {
  for (const name of patches) {
    try {
      const patch = `\n./patch_${name}.sh`;
      const ok = await install(patch);
      if (ok) {
        await writeFile(INSTALL_PATCH_SCRIPT, patch, {
          flag: constants.O_APPEND | constants.O_CREAT,
        });
      }
    } catch (error) {
      console.error(`不支持补丁${name}`);
    }
  }
};
const patches = {
  desktop: "应用快捷方式补丁",
  ld: "LD_LIBRARY_PATH 补丁",
  glib: "Glib typelib,schemas 补丁",
  java: "JAVA环境补丁",
  qt: "QT环境补丁",
  mono: "MONO环境补丁",
  icon: "图标补丁",
};
const description = Object.entries(patches)
  .map(([id, desc]) => ` - ${id}\t\t${desc}`)
  .join("\n");
export const patchCommand = new Command("patch")
  .description(`添加应用补丁`)
  .argument(`<name...>`, `补丁列表:\n${description}`, (y, x) => x.concat(y), [])
  .action(patch);
