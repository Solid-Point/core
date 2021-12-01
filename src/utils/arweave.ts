import Arweave from "arweave";
import base64url from "base64url";
import { gql, request } from "graphql-request";

export const toBytes = (input: string): Buffer => {
  return Buffer.from(base64url.decode(input, "hex"), "hex");
};

export const fromBytes = (input: string): string => {
  return base64url.encode(input.slice(2), "hex");
};

export const fetchLatestArweaveTransaction = async (
  pool: string
): Promise<string | undefined> => {
  const client = new Arweave({
    host: "arweave.net",
    protocol: "https",
  });

  const query = gql`
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

  const result = await request("https://arweave.net/graphql", query, { pool });
  const edges = result.transactions.edges;

  if (edges.length) {
    return (
      await client.transactions.getData(edges[0].node.id, {
        decode: true,
        string: true,
      })
    ).toString();
  }
};
