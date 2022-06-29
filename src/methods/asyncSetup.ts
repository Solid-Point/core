import KyveCore from "../main";

export async function asyncSetup(this: KyveCore): Promise<void> {
  this.client = await this.sdk.fromMnemonic(this.mnemonic);
}
