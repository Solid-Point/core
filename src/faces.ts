import { Observable } from "rxjs";
import { Logger } from "tslog";

// Uploader types.

export type Tag = { name: string; value: string };
export type Tags = Tag[];

export interface UploadFunctionReturn {
  data: string;
  tags?: Tags;
}

export interface UploadFunctionSubscriber {
  upload(value?: UploadFunctionReturn): void;
}

export type BundlerFunction<ConfigType> = (
  config: ConfigType,
  fromHeight: number,
  toHeight: number
) => void;

// Listener types.

export type Bundle = UploadFunctionReturn[];

export interface ListenFunctionReturn {
  transaction: string;
  bundle: Bundle;
}

export type ListenFunctionObservable = Observable<ListenFunctionReturn>;

// Validator types.

export interface ValidateFunctionReturn {
  transaction: string;
  valid: boolean;
}

export interface ValidateFunctionSubscriber {
  vote(value?: ValidateFunctionReturn): void;
}

export type ValidateFunction<ConfigType> = (
  listener: ListenFunctionObservable,
  validator: ValidateFunctionSubscriber,
  config: ConfigType,
  logger: Logger
) => void;
