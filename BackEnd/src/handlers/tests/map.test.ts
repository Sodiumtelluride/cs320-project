import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateDistance, getLocationData, isOpen } from "../map.js";

/*
    Will need to modify tests once hours and geocoords are added to DB
    Right now I'm just assuming every location will have [7, 20] as their hours
    tee hee
*/

// Reset time mocks
afterEach(() => {
    vi.useRealTimers();
});

describe("calculateDistance", () => {
    // Checkt that invalid coordinates are handled correclty
    it("returns NaN when coordinates are invalid", () => {
        expect(calculateDistance(
            { latitude: Number.NaN, longitude: 0 },
            { latitude: 0, longitude: 0 }
        )).toBeNaN();
    });

    // Check that the distance between two poitns is correct
    it("returns the distance between two points in meters", () => {
        expect(calculateDistance(
            { latitude: 0, longitude: 0 },
            { latitude: 0, longitude: 1 }
        )).toBe(111319); // HEADS UP THIS USES METERS
    });
});

describe("isOpen", () => {
    // Checkt that invalid hours are handled correclty
    it("throws when hours are invalid", () => {
        expect(() => isOpen([7])).toThrow("Invalid hours given");
        expect(() => isOpen([7, -1,])).toThrow("Hours don't exist");
    });

    // Check that true is returned when the current time is between the given hours
    it("returns true when the current time is between the given hours", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 0, 1, 12));

        expect(isOpen([7, 20])).toBe(true);
    });

    // Check that false is returned when the current time is outside given hours
    it("returns false when the current time is outside the given hours", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 0, 1, 6));

        expect(isOpen([7, 20])).toBe(false);
    });
});

describe("getLocationData", () => {
    // Properly handles case where user's location data is not given in request
    it("leaves distance undefined when user location is not provided", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 0, 1, 12));

        expect(getLocationData("HERTER CAFÉ", true).distance).toBeUndefined();
    });

    // Returns data of the expected json format
    it("returns data in expected format", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 0, 1, 12));

        expect(getLocationData("HERTER CAFÉ", false)).toEqual({
            name: "HERTER CAFÉ",
            coords: { latitude: 42.38747140261442, longitude: -72.52715660614095 },
            distance: undefined,
            hours: [7, 20],
            openStatus: true
        });
    });
});
