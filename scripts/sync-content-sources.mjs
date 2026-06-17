import { runContentSourceSync } from "./content-sources/sync.mjs";

const validateOnly = process.argv.includes("--validate-only");

runContentSourceSync({ validateOnly }).catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
