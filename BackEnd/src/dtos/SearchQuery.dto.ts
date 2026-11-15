export interface SearchQuery {
    // Keep track of user's ID f
    // Can't show them their food allergies
    userID: number;
    query: string;
    filter?: string | string[];


    // Add other parameters as needed
}