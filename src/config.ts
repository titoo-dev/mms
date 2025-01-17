import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";

export const BASE_CONFIG_DIR = (
  fs.existsSync(process.env.XDG_CONFIG_HOME as fs.PathLike)
    ? path.join(process.env.XDG_CONFIG_HOME!, "mms")
    : path.join(os.homedir(), ".config", "mms")
)!;

const DEFAULT_CONFIG: Config = {
  serverPort: 4000,
  musicPath: "~/Music",
};

const sanitizePath = (path: string) => {
  return path.replace(/~|\$HOME/g, os.homedir());
};

const ensurePathExists = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
  return path;
};

export const coverPath = ensurePathExists(path.join(BASE_CONFIG_DIR, "covers"));
export const configFilePath = path.join(
  ensurePathExists(BASE_CONFIG_DIR),
  "config.json",
);

const buildConfig = () => {
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }

  const config = JSON.parse(fs.readFileSync(configFilePath, "utf-8")) as Config;
  config.musicPath = sanitizePath(config.musicPath);
  return config;
};

export const config = buildConfig();

export type Config = {
  musicPath: string;
  serverPort?: number;
};
