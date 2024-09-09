// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Command } from "commander";
import { install, installPatches } from "./utils.js";

const allPatches = {
  ld: "LD_LIBRARY_PATH 补丁",
  glib: "Glib typelib,schemas 补丁",
  java: "JAVA环境补丁",
  qt: "QT环境补丁",
  mono: "MONO环境补丁",
  icon: "图标补丁",
};
export const patch = async (patches: string[]) => {
  const list = await Promise.all(
    patches.map(async (name) => {
      if (!(name in allPatches)) {
        console.error(`不支持补丁`, name);
        return null;
      }
      const patch = `./patch_${name}.sh`;
      const ok = await install(patch);
      if (ok) {
        console.log("已添加补丁", name);
      } else {
        console.log("已跳过补丁", name);
      }
      return ok ? patch : null;
    })
  );
  await installPatches(list.filter((x) => x != null));
};
const description = Object.entries(allPatches)
  .map(([id, desc]) => ` - ${id}\t\t${desc}`)
  .join("\n");
export const patchCommand = new Command("patch")
  .description(`添加应用补丁`)
  .argument(`<name...>`, `补丁列表:\n${description}`, (y, x) => x.concat(y), [])
  .action(patch);
