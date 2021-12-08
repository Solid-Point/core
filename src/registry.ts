import http from "http";
import url from "url";
import client, {register as globalRegister} from "prom-client";

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "kyve-core",
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Define the HTTP server
const server = http.createServer(async (req: any, res: any) => {
  // Retrieve route from request object
  const route = url.parse(req.url).pathname;

  if (route === "/metrics") {
    // Return all metrics the Prometheus exposition format
    res.setHeader("Content-Type", register.contentType);
    const defaultMetrics = await register.metrics();
    const global = await globalRegister.metrics();
    res.end(defaultMetrics + global);
  }
});

// Start the HTTP server which exposes the metrics on http://localhost:8080/metrics
// server.listen(8080);

export { client, server, register };
