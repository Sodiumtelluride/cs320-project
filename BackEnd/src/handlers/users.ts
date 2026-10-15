import type { Request, Response } from "express-serve-static-core";
import type { CreateUserDto } from "../dtos/CreateUser.dto.js";
import type { CreateUserQueryParams } from "../types/query-params.js";
import type { User } from "../types/response.js";

export function getUsers(request: Request, response: Response) {
    response.send([]);
}

export function getUserById(request: Request, response: Response) {
    response.send({});
}

// Requests will need to be type annotated as such:
export function createUser(request: Request<{}, {}, CreateUserDto, CreateUserQueryParams>, response: Response<User>) {
    // CreateUserDto interface makes it WAY easier to get data from the request body
    // Same goes for CreateUserQueryParams
    // Good practice to type annotate these properties

    response.status(201).send({
        id: 1,
        username: "victor-needs-mental-help",
        email: "vhenney@umass.edu"
    });
    
}