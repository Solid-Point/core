// Define the HTTP server
import http from "http";
import url from "url";
import client, { register } from "prom-client";

// Enable the collection of default metrics
client.collectDefaultMetrics({
  labels: { app: "kyve-core" },
});

// client.register.setDefaultLabels({
//  app: process.env.KYVE_RUNTIME,
// });

export { client };

// HTTP server which exposes the metrics on http://localhost:8080/metrics
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
