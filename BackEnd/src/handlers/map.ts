import type { Request, Response } from "express";
import { getDistance } from 'geolib';

/*
    Idea is to have frontend use Leaflet for the map design, or whatever other library you want
    https://leafletjs.com/
    This one has a nice little CSS popup you can customize.
    What I'm doing here is sending you data to fill it out

    Uses library Geolib for distance calculations
    https://www.npmjs.com/package/geolib
    Frontend can use W3C Geolocation API to get the user's current location and pass the longitutude and latitude to me 

    Can get user's position (on frontend) via
    navigator.geolocation.getCurrentPosition

    These should end up in the database at some point
    List of geocoords corresponding to dining hall name:
        MORRILL LIFE AND EARTH CAFÉ: 42.38989474997845, -72.52433510908577

        WHITMORE CAFÉ: 42.385882404679485, -72.52637552637368

        HERTER CAFÉ: 42.38747140261442, -72.52715660614095

        COURTSIDE CAFÉ: 42.3888823845504, -72.53167704012627

        PROCRASTINATION STATION: 42.38982420489098, -72.52824879961629

        QUAD CAFÉ: 42.39399493034662, -72.52862156254963

        WORCESTER MARKET - PERMANANTLY CLOSED :pensive_emoji:

        HAMPDEN MARKET - ×

        FRANKLIN MARKET - ×

        SOUTHWEST CAFÉ & SOUTHWEST DELIVERY EXPRESS

        PITA AT WORCESTER DC

        WORCESTER DC: 42.39359520483907, -72.52429636540208

        HAMPSHIRE DC: 42.38385258250406, -72.53052322175817

        BERKSHIRE DC: 42.381917508362285, -72.5299664858773

        FRANKLIN DC: 42.38946133095276, -72.52264346008035

        HAMPTEN DC: 42.382903326101726, -72.52972028156998

        BLUE WALL & PEOPLE’S ORGANIC COFFE: 42.391543947239924, -72.52669343118993

        HARVEST & UPUB

        UNIVERSITY CLUB & RESTURAUNT

        ISB CAFÉ
*/


type geoCoord = {
    latitude: number,
    longitude: number
}

// These should end up in the database at some point
// List of geocoords corresponding to dining hall name:
// Names also need to be changed to fit the database
const hallLocations: Record<string, geoCoord> = {
  "MORRILL LIFE AND EARTH CAFÉ": {latitude: 42.385882404679485, longitude: -72.52637552637368},
  "HERTER CAFÉ": {latitude: 42.38747140261442, longitude: -72.52715660614095},
  "worcester": {latitude: 42.39359520483907, longitude: -72.52429636540208},
  "hampshire": {latitude: 42.38385258250406, longitude: -72.53052322175817},
  "berkshire": {latitude: 42.381917508362285, longitude: -72.5299664858773},
  "franklin": {latitude: 42.38946133095276, longitude: -72.52264346008035},
  "hampton": {latitude: 42.382903326101726, longitude: -72.52972028156998},
  "BLUE WALL & PEOPLE’S ORGANIC COFFE": {latitude: 42.391543947239924, longitude: -72.52669343118993}
};

// Get straight-line distance between points
export function calculateDistance(pointA: geoCoord, pointB: geoCoord) {
    return getDistance(pointA, pointB);
}

export function isOpen(hours: number[]) {
    // Check if given correct hours
    if(hours.length !== 2)
        throw new Error("Invalid hours given");

    if(hours[0] == undefined || hours[1] == undefined)
        throw new Error("Hours don't exist");

    // Return status of DC
    const now = new Date();
    if(now.getHours() > hours[0] && now.getHours() < hours[1])
        return true;
    return false;
}

// Return data to display in map pin
export function getLocationData(name: string, calcDistance: boolean, userLocation?: geoCoord) {
    // Get geoCoords of DC
    const coords = hallLocations[name];
    if(!coords) {
        throw new Error("Coords unavailible for DC: " + name)
    }

    // If given user location calculate distance
    let distance = undefined;
    if(calcDistance) {
        if(userLocation)
            distance = calculateDistance(coords, userLocation);
    }

    // Check if open, get open hours
    // I need to ask you guys to add Geo-coords and operation hours to the database :praying_emoji:
    const hours = [ 7, 20 ]; // These are temporary values do not use this in final demonstartion

    // Calculate open status
    const openStatus = isOpen(hours);

    // For now this is all I can send per pin I believe
    return { name, coords, distance, hours, openStatus };
}

// GET /api/map/locations 
// Sends all map pins at once | Using this one may be more convenient
export async function getAllLocationData(request: Request<{ userLocation: geoCoord }>, response: Response) {
    // Only calculate distance if given user's location
    const calcDistance = request.body.userLocation !== undefined ? true : false;

    // Get data for all halls
    const data = [];
    for (const [name, coords] of Object.entries(hallLocations)) {
        data.push(getLocationData(name, calcDistance, request.body.userLocation));
    }

    // Construct json response
    // Front end fellas should use the name to add the link to the DC's menu page
    response.json(data);
}