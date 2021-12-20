import chalk from "chalk";
import cliProgress, { SingleBar } from "cli-progress";

export class Progress {
  private progress: SingleBar;

  constructor(unit: string) {
    this.progress = new cliProgress.SingleBar({
      format: `${chalk.gray(
        new Date().toISOString().replace("T", " ").replace("Z", " ")
      )} ${chalk.bold.blueBright(
        "INFO"
      )} [{bar}] {percentage}% | {value}/{total} ${unit}`,
    });
  }

  public start(total: number, startValue: number) {
    this.progress.start(total, startValue);
  }

  public update(current: number) {
    this.progress.update(current);
  }

  public stop() {
    this.progress.stop();
  }
}
