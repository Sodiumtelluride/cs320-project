import { Parser, DataNode } from "./parser.js";
import { parse } from "node-html-parser";

export class MenuConstructor {

    

  static async constructMenuDataFromLink(URL: string) {
    const menuNode = new DataNode();
    const menujson = await (await fetch(URL)).json();

    for (const [time, timeData] of Object.entries(menujson)) {
      const mealTimeData = new DataNode();
      for (const [station, stationData] of Object.entries(
        timeData as Record<string, any>,
      )) {
        const htmlData = parse(stationData as string);
        mealTimeData.data.set(station, await MenuConstructor.stationHtmlParse(htmlData));
      }
      menuNode.data.set(time, mealTimeData);
    }

    return menuNode;
  }

  static async stationHtmlParse(html: parse.HTMLElement) {
    const stationNode = new DataNode();
    const meals = html.querySelectorAll("li.lightbox-nutrition");
    let mealNode;
    let subbox;
    let name;
    for (const meal of meals) {
      mealNode = new DataNode();
      subbox = meal.querySelector("a");
      if (subbox === undefined || subbox === null) break;
      name = subbox.getAttribute("data-dish-name");
      if (name === undefined) break;
      stationNode.data.set(name, mealNode);
      let ingredientsNode;
      let allergensNode;
      for (const [attributeName, value] of Object.entries(subbox.attributes)) {
        if (
          attributeName !== "data-dish-name" &&
          attributeName !== "data-ingredient-list" &&
          attributeName !== "href" &&
          attributeName !== "data-allergens"
        ) {
          mealNode.data.set(attributeName, value);
        } else if (attributeName === "data-ingredient-list") {
          ingredientsNode = new DataNode();
          const ingredients = MenuConstructor.splitIngredient(value);
          let i = 0;
          for (const ingredient of ingredients) {
            i++;
            ingredientsNode.data.set("ingredient" + i, ingredient);
          }
          mealNode.data.set(attributeName, ingredientsNode);
        } else if (attributeName === "data-allergens") {
          allergensNode = new DataNode();
          const allergens = MenuConstructor.splitIngredient(value);
          let i = 0;
          for (const allergen of allergens) {
            i++;
            allergensNode.data.set("allergen" + i, allergen);
          }
          mealNode.data.set(attributeName, allergensNode);
        }
      }
      mealNode.data.set("price",null);
      const price = meal.querySelector(".meal-price");
      if(price) mealNode.data.set("price",price.textContent);
    }
    return stationNode;
  }

  static splitIngredient(originalSTR: string | undefined): string[] {
    const returnArr = [] as string[];
    if (originalSTR == undefined) return returnArr;
    var tempSTR = "";
    var insideParenth = false;
    for (const char of originalSTR) {
      tempSTR += char;
      if (char == "(") insideParenth = true;
      else if (char == ")") insideParenth = false;
      else if (!insideParenth && char == ",") {
        returnArr.push(tempSTR);
        tempSTR = "";
      }
    }
    returnArr.push(tempSTR);
    return returnArr;
  }

  public static pageId(pageName : string) : number{
    switch (pageName) {
        case "Berkshire Grab ‘N Go" :
            return 10666;
        case "Worcester Grab ‘N Go" :
            return 10667;
        case "Hampshire Grab ‘N Go" :
            return 10715;
        case "Franklin Grab ‘N Go" :
            return 10716;
        case "People's Organic Coffee" :
            return 32;
        case "Harvest Market" :
            return 4306;
        case "Tavola" :
            return 4661;
        case "Yum! Bakery":
            return 4666; //all dates show closed
        case "Green Fields":
            return 4671;
        case "Tamales" :
            return 4676;
        case "Wasabi" :
            return 4681;
        case "Deli Delish":
            return 4686;
        case "Star Ginger":
            return 4691;
        case "The Grill":
            return 4696;
        case "Paciugo":
            return -1; //page doesn't even load the menu display to begin with
        case "Whitmore Café":
            return 14;
        case "Procrastination Station":
            return 17;
        case "Courtside Café":
            return 18;
        case "babyBerk":
            return -1; //page displays image
        case "Worcester Café":
            return 647;
        case "ISB Café":
            return 883;
        case "babyBerk 2" :
            return -1; //page displays image
        case "Hampshire Café" :
            return 1723;
        case "Roots Café" :
            return 1724;
        case "Morrill Café" :
            return 2061;
        case "Peet’s Coffee & Tea" :
            return 4311;
        case "The Hub" :
            return 9150;
        case "Argo Tea":
            return -1; //ALSO SPECIAL IDK WHY THEY DID THIS IT IS THE WORST ONE SO FAR AHHHHHHHHHHHHHHHH!!!!!!!!!!
        case "Newman Café":
            return 9980;
        case "Snack Overflow":
            return 9981;
        case "Post & Bean Café":
            return 10293;
        case "Carney Café" :
            return 10392;
        case "The Commonwealth Restaurant":
            return -1; //special menus again this time its a page that has 4 links to diffrent images
        case "UMass Club":
            return -1; //another page with a link to an off website page
        case "Charles River Campus of UMass Amherst":
            return 10372;

        
        default:
            return -1;
    }
  }
}
