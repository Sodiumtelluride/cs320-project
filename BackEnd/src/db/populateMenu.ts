import { refreshMenus } from "./refreshMenus.js";

// Preserve the old entry point while using atomic location/day replacement.
export async function populateMenu() {
  const failures = await refreshMenus();
  if (failures.length) throw new Error(`Menu refresh failed: ${failures.join("; ")}`);
}
