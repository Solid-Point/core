import KyveCore from "../main";

export async function validate(this: KyveCore) {
  this.logger.log(`${this.name} validated`);
}
