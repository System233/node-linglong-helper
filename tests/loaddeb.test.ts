// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { fromDebFile } from "../src/utils";

const data = await fromDebFile("test.deb", { cacheDir: ".cache" });
console.log(data);
