import { Observable } from "rxjs";
import { Logger } from "tslog";
export declare type Tag = {
    name: string;
    value: string;
};
export declare type Tags = Tag[];
export declare type Vote = {
    transaction: string;
    valid: boolean;
};
export declare type BlockInstructions = {
    uploader: string;
    fromHeight: number;
    toHeight: number;
};
export interface UploadFunctionReturn {
    data: string;
    tags?: Tags;
}
export interface UploadFunctionSubscriber {
    upload(value?: UploadFunctionReturn): void;
}
export declare type BundlerFunction<ConfigType> = (config: ConfigType, fromHeight: number, toHeight: number) => Promise<any[]>;
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
export interface ValidateFunctionSubscriber {
    vote(value?: ValidateFunctionReturn): void;
}
export declare type ValidateFunction<ConfigType> = (listener: ListenFunctionObservable, validator: ValidateFunctionSubscriber, config: ConfigType, logger: Logger) => void;
