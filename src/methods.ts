import KYVE from "./main";

export async function validate(this: KYVE) {
  this.logger.log(`${this.key} validated`);
}
