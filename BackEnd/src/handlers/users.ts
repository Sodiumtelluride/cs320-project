import type { Request, Response } from "express-serve-static-core";
import type { CreateUserDto } from "../dtos/CreateUser.dto.js";
import type { CreateUserQueryParams } from "../types/query-params.js";
import type { User } from "../types/response.js";

export function getUsers(request: Request, response: Response) {
    response.send({});
}

export function getUserById(request: Request, response: Response) {
    response.send({});
}

// Requests will need to be type annotated as such:
export function createUser(request: Request<{}, {}, CreateUserDto, CreateUserQueryParams>, response: Response<User>) {
    // CreateUserDto interface makes it WAY easier to get data from the request body
    // Same goes for CreateUserQueryParams
    // Good practice to type annotate these properties

    /*
        request.body.email
        request.body.name
        request.body.password
    */

    console.log(request.session);
    console.log(request.sessionID);
    // request.session.visited = true;

    // Should run database checks here | Make sure they're not in the database

    // Hash user's password for the database

    // This is what will be returned to frontend afterwards
    // Obviously do NOT use this example
    // I need to chat with the database team
    response.status(201).send({
        id: 1,
        username: "victor-needs-mental-help",
        email: "vhenney@umass.edu"
    });
}

export function login() {

}

export function logout() {

}

export function editUser() {
    
}

export function addAllergy() {
    // Should get a list of ingrediants -> Search through it -> Make sure ingrediant user typed actually exists
}

export function removeAllergy() {
    // Make sure user has allergy
    // Delete it
}

export function viewAllergies() {

}