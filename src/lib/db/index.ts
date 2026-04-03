import * as contracts from "./contracts";
import * as users from "./users";
import * as disputes from "./disputes";
import * as escrows from "./escrows";
import * as holdings from "./holdings";
import * as team from "./team";

export { ensureInit } from "./init";

export const db = {
  contracts,
  users,
  disputes,
  escrows,
  holdings,
  team,
};
