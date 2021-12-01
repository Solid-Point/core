"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLatestArweaveTransaction = exports.fromBytes = exports.toBytes = void 0;
const arweave_1 = __importDefault(require("arweave"));
const base64url_1 = __importDefault(require("base64url"));
const graphql_request_1 = require("graphql-request");
const toBytes = (input) => {
    return Buffer.from(base64url_1.default.decode(input, "hex"), "hex");
};
exports.toBytes = toBytes;
const fromBytes = (input) => {
    return base64url_1.default.encode(input.slice(2), "hex");
};
exports.fromBytes = fromBytes;
const fetchLatestArweaveTransaction = async (pool) => {
    const client = new arweave_1.default({
        host: "arweave.net",
        protocol: "https",
    });
    const query = (0, graphql_request_1.gql) `
    query ($pool: String!) {
      transactions(
        tags: [
          { name: "Application", values: "KYVE - Testnet" }
          { name: "Pool", values: [$pool] }
        ]
        first: 1
      ) {
        edges {
          node {
            id
          }
        }
      }
    }
  `;
    const result = await (0, graphql_request_1.request)("https://arweave.net/graphql", query, { pool });
    const edges = result.transactions.edges;
    if (edges.length) {
        return (await client.transactions.getData(edges[0].node.id, {
            decode: true,
            string: true,
        })).toString();
    }
};
exports.fetchLatestArweaveTransaction = fetchLatestArweaveTransaction;
