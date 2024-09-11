// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import {
  ValidationOptions,
  registerDecorator,
  validateOrReject,
} from "class-validator";

export function IsMatchRegExp(
  regex: RegExp,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "IsMatchRegexp",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value, validationArguments) {
          return regex.test(value);
        },
        defaultMessage(validationArguments) {
          return `${validationArguments.property}格式不正确`;
        },
      },
    });
  };
}

export function ValidateMixedType(
  cb: (item: any) => new () => any,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "ValidateMixedType",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        async validate(value, validationArguments) {
          const type = cb(value);
          if (!type) {
            return false;
          }
          const inst = plainToInstance(type, value);
          await validateOrReject(inst);
          return true;
        },
        defaultMessage(validationArguments) {
          return `${validationArguments.property}类型不匹配`;
        },
      },
    });
  };
}
