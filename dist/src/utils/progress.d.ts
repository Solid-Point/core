export declare class Progress {
    private progress;
    constructor(unit: string);
    start(total: number, startValue: number): void;
    update(current: number): void;
    stop(): void;
}
