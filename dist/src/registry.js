"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.client = void 0;
const http = require("http");
const url = require("url");
const client = require("prom-client");
exports.client = client;
// Create a Registry which registers the metrics
const register = new client.Registry();
// Add a default label which is added to all metrics
register.setDefaultLabels({
    app: "kyve-core",
});
// Enable the collection of default metrics
client.collectDefaultMetrics({ register });
// Define the HTTP server
const server = http.createServer(async (req, res) => {
    // Retrieve route from request object
    const route = url.parse(req.url).pathname;
    if (route === "/metrics") {
        // Return all metrics the Prometheus exposition format
        res.setHeader("Content-Type", register.contentType);
        res.end(await register.metrics());
    }
});
exports.server = server;
