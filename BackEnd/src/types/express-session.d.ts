import "express-session";

// Declare that each request sent from a user has their userID
declare module "express-session" {
    interface SessionData {
        userId?: string;
    }
}