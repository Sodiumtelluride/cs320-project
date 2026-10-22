/*

    Basically a data type

    Any request we can create one of these

    Makes it easier to track what exactly each request will contain

*/

export interface CreateUserDto {
    name: string;
    email: string;
    password: string;
}