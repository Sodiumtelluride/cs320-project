export function cleanDietaryTags(cleanDiet: string|null): string[]{
  if(!cleanDiet){
    return [];
  }
  const filter: string[] = ["vegetarian", "local", "halal", "plant-based"]

  let cleaned: string[] = cleanDiet.split(",").map(tag => tag.trim().toLowerCase());
  cleaned = cleaned.map(tag => tag==="plant based" ? "plant-based" : tag);
  return [... new Set(cleaned.filter(tag => filter.includes(tag)))]

}