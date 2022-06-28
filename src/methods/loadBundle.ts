import KyveCore from "../main";

export async function validate(this: KyveCore) {
  this.logger.info(`${this.name} validated`);
}
