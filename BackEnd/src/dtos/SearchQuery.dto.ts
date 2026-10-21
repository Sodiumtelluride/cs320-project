export interface SearchQuery {
    // Keep track of user's ID
    // Can't show them their food allergies
    userID: number;
    query: string;

    // Add other parameters as needed
}