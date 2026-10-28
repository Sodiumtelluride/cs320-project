import type { Request, Response } from "express-serve-static-core";
import { supabase } from "../db/client.js";
import * as bcrypt from "bcrypt";

export async function login(request: Request, response: Response) {
    // Make sure email and password match
    const authStatus = await validateUser(request.body.email, request.body.password);

    if (!authStatus.success) {
        return response.status(401).json({
            error: "Invalid login"
        });
    }

    // Once validated, set session to user's ID
    request.session.userId = authStatus.id;

    return response.status(200).json({
        message: "😎 All logged in champ hell yeah"
    });
}

async function validateUser(request: Request, response: Response) {
    // Check if given correct login information
    const { data: user, error } = await supabase
        .from("users")
        .select("id, username, password_hash")
        .eq("username", request.body.username)
        .maybeSingle();
  
    if (error) {
        return { success: false, id: undefined };
    }

    // If the user doesn't exist, or password doesn't match it's hash fail
    if (!user || !(await bcrypt.compare(request.body.password, user.password_hash))) {
        return { success: false, id: undefined };
    }

    // Return user ID
    return { success: true, id: user.id };
}

// Just delete session data yup
export function logout(request: Request, response: Response) {
    request.session.destroy((err) => {
        // This shouldn't ever happen
        // Can happen if session name is changed from 'sessionID' and someone with old cookies tries to log out
        if (err) {
            return response.status(500).json({
                error: "Failed to log out"
            });
        }

        // Delete all set cookies
        response.clearCookie("sessionID");

        return response.status(200).json({
            message: "Logged out successfully"
        });
    });
}