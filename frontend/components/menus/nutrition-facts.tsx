import type { NutritionFacts as NutritionData, Nutrient } from "@/lib/menus/types";

const rows: { key: keyof Omit<NutritionData, "servingSize" | "calories" | "caloriesFromFat">; label: string; inset?: boolean }[] = [
  { key: "totalFat", label: "Total Fat" },
  { key: "saturatedFat", label: "Saturated Fat", inset: true },
  { key: "transFat", label: "Trans Fat", inset: true },
  { key: "cholesterol", label: "Cholesterol" },
  { key: "sodium", label: "Sodium" },
  { key: "totalCarbohydrate", label: "Total Carbohydrate" },
  { key: "dietaryFiber", label: "Dietary Fiber", inset: true },
  { key: "totalSugars", label: "Total Sugars", inset: true },
  { key: "addedSugars", label: "Added Sugars", inset: true },
  { key: "protein", label: "Protein" },
];

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function amount(nutrient: Nutrient | null | undefined): string {
  return nutrient == null ? "Not provided" : `${number.format(nutrient.amount)}${nutrient.unit}`;
}

export function NutritionFacts({ nutrition }: { nutrition: NutritionData | null }) {
  if (!nutrition) {
    return <section aria-label="Nutrition facts" className="rounded-md border p-5">
      <h3 className="text-lg font-semibold">Nutrition Facts</h3>
      <p className="mt-2 text-sm text-muted-foreground">Nutrition information has not been provided for this item.</p>
    </section>;
  }

  return (
    <section aria-label="Nutrition facts" className="border-2 border-black bg-white p-3 text-black">
      <h3 className="text-3xl font-extrabold tracking-tight">Nutrition Facts</h3>
      <p className="mt-1 border-b-8 border-black pb-2 text-sm">Serving size {nutrition.servingSize ?? "not provided"}</p>
      <p className="mt-2 text-xs font-semibold">Amount per serving</p>
      <div className="flex items-end justify-between gap-3 border-b-4 border-black pb-2">
        <p className="text-xl font-bold">Calories <span className="text-3xl">{nutrition.calories == null ? "—" : number.format(nutrition.calories)}</span></p>
        {nutrition.caloriesFromFat != null && <p className="pb-1 text-xs">Fat Cal. {number.format(nutrition.caloriesFromFat)}</p>}
      </div>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Nutrients per serving and percent daily value</caption>
        <thead><tr><th scope="col" className="sr-only">Nutrient and amount</th><th scope="col" className="py-1 text-right text-xs">% Daily Value*</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const value = nutrition[row.key];
            return <tr key={row.key} className="border-t border-black">
              <th scope="row" className={`py-1.5 text-left ${row.inset ? "pl-3 font-normal" : "font-semibold"}`}>
                {row.label} <span className="font-normal">{amount(value)}</span>
              </th>
              <td className="pl-2 text-right align-top tabular-nums pt-1.5">{value?.dailyValue == null ? "—" : `${number.format(value.dailyValue)}%`}</td>
            </tr>;
          })}
        </tbody>
      </table>
      <p className="mt-1 border-t-4 border-black pt-2 text-[11px] leading-snug">*Percent Daily Values are based on a 2,000 calorie diet. A dash indicates that a daily value was not provided.</p>
    </section>
  );
}
