import type { Request, Response } from "express-serve-static-core";
import type { SearchQuery } from "../dtos/SearchQuery.dto.js";
import { Searcher } from "../searching/searcher.js";

function enforceFilterArr(filter? :string | string[]) : string[]{
    if(!filter) return [];
    if(typeof(filter) === "string") return [filter];
    return filter;
}

export async function search(
  request: Request<{}, {}, {}, SearchQuery>,
  response: Response
) {
    const query = request.query.query?.trim();
    if(!query) {
        return response.status(400).json({error : "Missing parameter: query"});
    }

    const filter = enforceFilterArr(request.query.filter);
    const userID = request.query.userID; // not used for now, implement in future pr.
    return response.status(200).json(await Searcher.getInstance().advancedSearch(query,filter))
    
}

export async function partialSearch(
  request: Request<{}, {}, {}, SearchQuery>,
  response: Response
) {
    const query = request.query.query?.trim();
    if(!query) {
        return response.status(400).json({error : "Missing parameter: query"});
    }

    const filter = enforceFilterArr(request.query.filter);
    const userID = request.query.userID; // not used for now, implement in future pr.
    return response.status(200).json(await Searcher.getInstance().partialInputSearch(query,filter))
    
}