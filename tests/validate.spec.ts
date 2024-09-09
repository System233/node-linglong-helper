// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { join } from "path";
import { loadYAML, validateYAML } from "../src/utils.js";
import { IProject } from "../src/interface.js";
import yaml from 'yaml'

const main = async () => {
  const data = await loadYAML<IProject>(join("tests", "./linglong.test.yaml"));
  const project=await validateYAML(data);
  console.log(project)
  console.log(yaml.stringify(project))
};

main().catch(console.error)