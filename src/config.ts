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
  musicPath: "C:\/Users\/PC\/Music",
};

/**
 * Replaces '~' and '$HOME' with the user's home directory in the provided path.
 * @param {string} path - The file path to sanitize.
 * @returns {string} - The sanitized file path.
 */
const sanitizePath = (path: string) => {
  return path.replace(/~|\$HOME/g, os.homedir());
};

/**
 * Ensures that the provided directory path exists, creating it recursively if necessary.
 * @param {string} path - The directory path to verify.
 * @returns {string} - The verified existing directory path.
 */
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

/**
 * Builds the configuration object from the config file.
 * If the config file does not exist, it is created with default values.
 * Then the musicPath is sanitized.
 * @returns {Config} - The loaded and sanitized configuration.
 */
const buildConfig = (): Config => {
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }

  const config: Config = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
  return {
    ...config,
    musicPath: sanitizePath(config.musicPath),
  };
};

export const config = buildConfig();

export type Config = {
  musicPath: string;
  serverPort?: number;
};
