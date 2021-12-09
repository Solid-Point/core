"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.client = void 0;
// Define the HTTP server
const http_1 = __importDefault(require("http"));
const url_1 = __importDefault(require("url"));
const prom_client_1 = __importStar(require("prom-client"));
exports.client = prom_client_1.default;
// Enable the collection of default metrics
prom_client_1.default.collectDefaultMetrics({
    labels: { app: "kyve-core" },
});
// HTTP server which exposes the metrics on http://localhost:8080/metrics
exports.server = http_1.default.createServer(async (req, res) => {
    // Retrieve route from request object
    const route = url_1.default.parse(req.url).pathname;
    if (route === "/metrics") {
        // Return all metrics the Prometheus exposition format
        res.setHeader("Content-Type", prom_client_1.register.contentType);
        const defaultMetrics = await prom_client_1.register.metrics();
        const other = await prom_client_1.default.register.metrics();
        res.end(defaultMetrics + "\n" + other);
    }
});
