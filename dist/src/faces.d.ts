import { Observable } from "rxjs";
import { Logger } from "tslog";
export declare type Tag = {
    name: string;
    value: string;
};
export declare type Tags = Tag[];
export interface UploadFunctionReturn {
    data: string;
    tags?: Tags;
}
interface UploadFunctionSubscriber {
    upload(value?: UploadFunctionReturn): void;
}
export declare type UploadFunction<ConfigType> = (uploader: UploadFunctionSubscriber, config: ConfigType, logger: Logger) => void;
export declare type Bundle = UploadFunctionReturn[];
export interface ListenFunctionReturn {
    transaction: string;
    bundle: Bundle;
}
export declare type ListenFunctionObservable = Observable<ListenFunctionReturn>;
export interface ValidateFunctionReturn {
    transaction: string;
    valid: boolean;
}
interface ValidateFunctionSubscriber {
    vote(value?: ValidateFunctionReturn): void;
}
export declare type ValidateFunction<ConfigType> = (listener: ListenFunctionObservable, validator: ValidateFunctionSubscriber, config: ConfigType, logger: Logger) => void;
export {};
