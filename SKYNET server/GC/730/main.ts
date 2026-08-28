import { gc } from "./framework/gc";
import { registerAuth } from "./modules/Auth";
import { registerClientServices } from "./modules/ClientServices";
import { registerInventory } from "./modules/Inventory";
import { registerMatchmaking } from "./modules/Matchmaking";
import { registerProfile } from "./modules/Profile";
import { registerServer } from "./modules/Server";

registerAuth();
registerClientServices();
registerInventory();
registerMatchmaking();
registerProfile();
registerServer();

export async function handle(): Promise<boolean> {
    return await gc.dispatch();
}

export function tick(): void {
    // AppID 730 currently has no periodic work. Exporting the entry point keeps
    // the host scheduler quiet and leaves room for later matchmaking timers.
}
