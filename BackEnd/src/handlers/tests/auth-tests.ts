import { describe, it, expect, beforeEach, vi } from "vitest";
import { validateUser, login, logout } from "../auth.js";

// Setup mocking for supabase and bcrypt
const { mockFrom, mockCompare } = vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockCompare: vi.fn(),
}));

vi.mock("../../db/client.js", () => ({
    supabase: {
        from: mockFrom,
    },
}));

vi.mock("bcrypt", () => ({
    compare: mockCompare,
}));

// Mock supabase.from()
// Used in order -> queryBuilder.select().eq().maybeSingle()
const queryBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
};

beforeEach(() => {
    vi.clearAllMocks();

    // Reset ALL mocks
    queryBuilder.select.mockReset();
    queryBuilder.eq.mockReset();
    queryBuilder.maybeSingle.mockReset();

    // Setup the chain for supabase.from()
    queryBuilder.select.mockReturnThis();
    queryBuilder.eq.mockReturnThis();
    mockFrom.mockReturnValue(queryBuilder);
});

// validateUser()
describe("Validation Method", () => {
    it("returns the user id for valid credentials", async () => {
        // Create a mock request object
        const request = {
            body: {
                username: "victor",
                password: "42",
            },
        } as any; // Has to be of type any or compiler gets angy

        // Mock response object for login()
        const response = {} as any;

        // Mock supabase response
        queryBuilder.maybeSingle.mockResolvedValue({
            data: {
                id: 42,
                username: "victor",
                password_hash: "42 hashed ooo so secret",
            },
            error: null,
        });
        // Pretend they match
        mockCompare.mockResolvedValue(true);

        await expect(validateUser(request, response)).resolves.toEqual({
            success: true,
            id: 42,
        });
    });

    it("rejects invalid credentials", async () => {
        // Create a mock request object
        const request = {
            body: {
                username: "biku",
                password: "43 (my hand slipped oopsie daisy)",
            },
        } as any; // Has to be of type any or compiler gets angy

        // Mock response object for login()
        const response = {} as any;

        // Mock supabase response
        queryBuilder.maybeSingle.mockResolvedValue({
            data: {
                id: 42,
                username: "biku",
                password_hash: "42 hashed ooo so secret",
            },
            error: null,
        });
        // In this case they wouldn't match anyway, but force a false output
        mockCompare.mockResolvedValue(false);

        await expect(validateUser(request, response)).resolves.toEqual({
            success: false,
            id: undefined,
        });
    });
});

// login()
describe("Login Route", () => {
    //
    it("logs in a user and stores the session user id", async () => {
        // Create a mock request object
        const request = {
            body: {
                email: "vitor@kickass-domain.com",
                password: "42",
            },
            session: {} // Setting session to empty to simulate not being logged in already
        } as any; // Has to be of type any or compiler gets angy

        // Mock a response object for login
        const response = {
            // Created in order to allow chaining of response.status().json()
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;

        // Mock supabase response
        queryBuilder.maybeSingle.mockResolvedValue({
            data: {
                id: 42,
                username: "vitor",
                password_hash: "42 hashed ooo so secret",
            },
            error: null,
        });
        // Brute force login
        mockCompare.mockResolvedValue(true);

        await login(request, response); // Actually try to login

        expect(request.session.userId).toBe(42);
        expect(response.status).toHaveBeenCalledWith(200);
        /*  Yes I'm keeping this status message
            I understand it's arguably inefficient to test it
            If you guys want to change it we can talk. */
        expect(response.json).toHaveBeenCalledWith({
            message: "😎 All logged in champ hell yeah",
        });
    });
});

// logout()
describe("Logout Route", () => {
    it("clears the session cookies when the user logs out", () => {
        // Mock both the destroy method of, and the session object
        // Looks complicated but vitest just needs a callback to check if the function was called
        const destroy = vi.fn((callback: (error?: Error | null) => void) => callback(null));
        const request = {
            session: {
                destroy,
            },
        } as any;

        // Mock a response object for logout
        const response = {
            clearCookie: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;

        logout(request, response); // Actually logout

        expect(destroy).toHaveBeenCalledTimes(1);
        expect(response.clearCookie).toHaveBeenCalledWith("sessionID");
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({
            message: "Logged out successfully",
        });
    });
});