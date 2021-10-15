<p align="center">
  <a href="https://kyve.network">
    <img src="https://user-images.githubusercontent.com/62398724/137493477-63868209-a19b-4efa-9413-f06d41197d6d.png" style="border-radius: 50%" height="96">
  </a>
  <h3 align="center"><code>@kyve/core</code></h3>
  <p align="center">🚀 The base KYVE node implementation.</p>
</p>

## Integrations

### Existing integrations

- [EVM](https://github.com/KYVENetwork/evm)

### Creating a custom integration

#### Installation

```
yarn add @kyve/core
```

#### Using KYVE in your application

##### Initiating a node

Next you need to set up the pool. You can create a new pool [here](https://app.kyve.network).

```ts
import KYVE from "@kyve/core";
import { BigNumber } from "ethers";

const pool = "0x...";
const pk = process.env.PK;
const stake = BigNumber.from(100).mul(10).pow(18);
const jwk = ... // Arweave keyfile (optional).
const name = "my-node"; // optional.

const node = new KYVE(pool, pk, stake, jwk, name);
```

##### Node configuration

KYVE requires two custom functions. One which fetches the data from your data source and one which validates this data. You can then simply add these two functions into the KYVE `run` method.

###### Specifying an upload function

To pass data into KYVE, simply call `subscriber.next()`:

```ts
const myUploader = (subscriber, config, logger) => {
  // use your custom logic here
  const data = ...
  subscriber.next({ data });
}
```

You can also, optionally, add custom tags to your transactions:

```ts
const myUploader = (subscriber, config, logger) => {
  // use your custom logic here
  const data = ...
  const tags = [...]
  subscriber.next({ data, tags });
}
```

###### Specifying a validation function

```ts
const myValidator = (listener, subscriber, config, logger) => {
  // use your custom logic here
  const valid = ...
  subscriber.next({ transaction: res.transaction, valid });
}
```

###### Running your node

To run your node, simply call the `run` function and pass your functions in:

```ts
node.run(myUploader, myValidator);
```

### Querying data

> Coming soon!

## Contributing

To contribute to this repository please follow these steps:

1.  Clone the repository
    ```
    https://github.com/KYVENetwork/core.git
    ```
2.  Install dependencies
    ```
    yarn install
    ```
