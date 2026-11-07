import {Searcher} from "./searching/searcher.js"

const t = new Date().getTime();
const testSearcher = new Searcher();
await testSearcher.getData();
const searchTerm = "honey";
console.log("searching for : " + searchTerm);
console.log(await testSearcher.SearchForSimilar(searchTerm,[]));
console.log(new Date().getTime() - t);
