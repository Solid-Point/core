import { Observable, Subscriber } from "rxjs";
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
export declare type UploadFunctionSubscriber = Subscriber<UploadFunctionReturn>;
export declare type UploadFunction<ConfigType> = (subscriber: UploadFunctionSubscriber, config: ConfigType, logger: Logger) => void;
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
export declare type ValidateFunctionSubscriber = Subscriber<ValidateFunctionReturn>;
export declare type ValidateFunction<ConfigType> = (listener: ListenFunctionObservable, subscriber: ValidateFunctionSubscriber, config: ConfigType, logger: Logger) => void;
