import { Core } from "./core";
declare class ProtocolNode extends Core {
    key: string;
    run(): Promise<void>;
}
export default ProtocolNode;
