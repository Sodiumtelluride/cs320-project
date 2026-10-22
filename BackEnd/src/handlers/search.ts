import type { Request, Response } from "express-serve-static-core";
import type { CreateUserDto } from "../dtos/CreateUser.dto.js";
import type { CreateUserQueryParams } from "../types/query-params.js";
import type { SearchQuery } from "../dtos/SearchQuery.dto.js";
// import type { Query } from "../types/response.js";

export function search(request: Request<{}, {}, SearchQuery, {}>) {
    /*
    
        request.body.userID
        request.body.query

    */
}