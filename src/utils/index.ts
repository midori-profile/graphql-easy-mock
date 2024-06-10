import { DEFAULT_APPLICATION_RULE } from "./constant";
import { handleMessageEvent } from "./utils";
import { Generate } from "./types";

const generateRules: Generate = async () => {
  return { ...DEFAULT_APPLICATION_RULE };
};

const main = () => {
  handleMessageEvent(generateRules);
};

main();
