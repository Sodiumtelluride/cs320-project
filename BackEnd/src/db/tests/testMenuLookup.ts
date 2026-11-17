import {getFoodInfo} from ".././menuLookup.js";

console.log(
    JSON.stringify(
        await getFoodInfo("Pizza", "2026-11-17"),
        null,
        2
    )
);