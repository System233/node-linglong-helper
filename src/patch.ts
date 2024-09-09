// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Command } from "commander";
import { install } from "./utils.js";
import { constants, writeFile } from "fs/promises";
import { INSTALL_PATCH_SCRIPT } from "./constant.js";

const allPatches = {
  desktop: "应用快捷方式补丁",
  ld: "LD_LIBRARY_PATH 补丁",
  glib: "Glib typelib,schemas 补丁",
  java: "JAVA环境补丁",
  qt: "QT环境补丁",
  mono: "MONO环境补丁",
  icon: "图标补丁",
};
export const patch = async (patches: string[]) => {
  for (const name of patches) {
    try {
      if (!(name in allPatches)) {
        console.error(`不支持补丁${name}`);
        continue;
      }
      const patch = `./patch_${name}.sh`;
      const ok = await install(patch);
      if (ok) {
        await writeFile(INSTALL_PATCH_SCRIPT, `\n${patch}`, {
          flag: constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY,
        });
      }
    } catch (error) {
      console.error(`补丁失败：${name}`, error);
    }
  }
};
const description = Object.entries(allPatches)
  .map(([id, desc]) => ` - ${id}\t\t${desc}`)
  .join("\n");
export const patchCommand = new Command("patch")
  .description(`添加应用补丁`)
  .argument(`<name...>`, `补丁列表:\n${description}`, (y, x) => x.concat(y), [])
  .action(patch);
