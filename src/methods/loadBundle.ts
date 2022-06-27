import { Core } from "../core";

export async function validate(this: Core) {
  this.logger.log(`${this.name} validated`);
}
