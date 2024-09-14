// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  IsArray,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  Validate,
  ValidateNested,
} from "class-validator";
import { IsMatchRegExp, ValidateMixedType } from "./validators.js";
import { Type } from "class-transformer";

export class IPackage {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  @IsMatchRegExp(/^\d+\.\d+\.\d+\.\d+$/)
  version: string;

  @IsEnum(["app", "runtime"])
  kind: "app" | "runtime";

  @IsString()
  description: string;
}
export class ISource {
  @IsEnum(["file", "archive", "git"])
  kind: "file" | "archive" | "git";

  @IsString()
  @IsUrl()
  url: string;

  @IsString()
  @IsOptional()
  digest?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  commit?: string;
}

export class IProject {
  @IsNumberString()
  version: string;

  @ValidateNested()
  @Type(() => IPackage)
  package: IPackage;

  @IsArray()
  @IsString({ each: true })
  command: string[];

  @IsString()
  @IsMatchRegExp(/^(\w+:)?\S+\/\d+\.\d+\.\d+(\.\d+)?(\/\w+)?$/)
  base: string;

  @IsString()
  @IsMatchRegExp(/^(\w+:)?\S+\/\d+\.\d+\.\d+(\.\d+)?(\/\w+)?$/)
  @IsOptional()
  runtime?: string;

  //   @ValidateMixedType((item) => (item.type == "git" ? ISourceGit : ISourceFile))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ISource)
  @IsOptional()
  sources?: Array<ISource>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclude?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  include?: string[];

  @IsString()
  build: string;

  [k: string]: any;
}

export interface InstallOption {
  root?: string;
  rename?: string;
  mode?: string;
}
