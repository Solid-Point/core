// Define the HTTP server
import http from "http";
import url from "url";
import client, { register } from "prom-client";

// Add a default label which is added to all metrics
client.register.setDefaultLabels({
  app: "kyve-core",
});

// Enable the collection of default metrics
client.collectDefaultMetrics();

export const server = http.createServer(async (req: any, res: any) => {
  // Retrieve route from request object
  const route = url.parse(req.url).pathname;

  if (route === "/metrics") {
    // Return all metrics the Prometheus exposition format
    res.setHeader("Content-Type", register.contentType);
    const defaultMetrics = await register.metrics();
    const other = await client.register.metrics();
    res.end(defaultMetrics + "\n" + other);
  }
});

// Start the HTTP server which exposes the metrics on http://localhost:8080/metrics
//server.listen(8080);
