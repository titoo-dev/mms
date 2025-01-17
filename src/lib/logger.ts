import * as path from "node:path";
import { BASE_CONFIG_DIR } from "../config.js";
import * as fs from "node:fs";

class Logger {
  private logFile = path.join(BASE_CONFIG_DIR, "log.txt");

  private async writeLog(message: string, severity: LogSeverity) {
    await fs.promises.writeFile(this.logFile, `[${severity}]: ${message}\n`, {
      flag: "a",
    });
  }

  async info(message: string) {
    await this.writeLog(message, "info");
  }

  async warn(message: string) {
    await this.writeLog(message, "warn");
  }

  async error(message: string) {
    await this.writeLog(message, "error");
  }
}

export const logger = new Logger();

export type LogSeverity = "info" | "warn" | "error";
