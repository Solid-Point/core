import { ILogObject, Logger } from "tslog";
import { appendFileSync } from "fs";

const logger = new Logger({
  displayFilePath: "hidden",
  displayFunctionName: false,
});

export default logger;
