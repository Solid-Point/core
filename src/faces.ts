import { Observable, Subscriber } from "rxjs";
import { Logger } from "tslog";

// Uploader types.

export type Tag = { name: string; value: string };
export type Tags = Tag[];

export interface UploadFunctionReturn {
  data: string;
  tags?: Tags;
}

export type UploadFunctionSubscriber = Subscriber<UploadFunctionReturn>;

export type UploadFunction<ConfigType> = (
  subscriber: UploadFunctionSubscriber,
  config: ConfigType,
  logger: Logger
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

export type ValidateFunctionSubscriber = Subscriber<ValidateFunctionReturn>;

export type ValidateFunction<ConfigType> = (
  listener: ListenFunctionObservable,
  subscriber: ValidateFunctionSubscriber,
  config: ConfigType,
  logger: Logger
) => void;
