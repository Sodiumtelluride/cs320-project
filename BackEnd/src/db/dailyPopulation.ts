import {populateMenu} from "./populateMenu.js";

function getFutureDate(daysAhead: number): string{
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().split("T")[0]!;
}

async function dailyPopulate(){
    const defaultDate = getFutureDate(13);
    const sevenDate = getFutureDate(7);
    const sixDate = getFutureDate(6);

    await populateMenu(defaultDate, sevenDate, sixDate);
}

await dailyPopulate();