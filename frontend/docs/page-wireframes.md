# Proposed Mobile Page Wireframes

Each column shows the content order from top to bottom.
These are structural wireframes, not final visual designs.

```mermaid
flowchart LR
    subgraph Home["Home"]
        direction TB
        H1["Header: campus selector and notification bell"]
        H2["Search food or locations"]
        H3["Favorite locations and today's menus"]
        H4["Categories: Café / Dining Hall / Blue Wall / Restaurant"]
        H5["Sort: default or nearest when location is enabled"]
        H6["Location cards: name, hours and busyness"]
        H7["Special events and occasions"]
        H8["Navigation: Home / Map / Favorites / Account"]
        H1 --> H2 --> H3 --> H4 --> H5 --> H6 --> H7 --> H8
    end

    subgraph Search["Search Results"]
        direction TB
        S1["Back button and search field"]
        S2["Campus, date and meal filters"]
        S3["Dietary and allergen filters"]
        S4["Matching food cards"]
        S5["Each card: food, location, meal and serving time"]
        S6["No matches: clear filters or edit search"]
        S1 --> S2 --> S3 --> S4 --> S5 --> S6
    end

    subgraph Location["Location Details"]
        direction TB
        L1["Back button, location name and favorite button"]
        L2["Hours, busyness and last updated time"]
        L3["Map link and distance when available"]
        L4["Date and meal selector"]
        L5["Menu by station, including Grab & Go if available"]
        L6["Food cards with dietary and allergen indicators"]
        L7["Location events and announcements"]
        L1 --> L2 --> L3 --> L4 --> L5 --> L6 --> L7
    end

    subgraph Food["Food Details Panel"]
        direction TB
        F1["Food name and favorite button"]
        F2["Serving locations, dates and meal times"]
        F3["Ingredients and reported allergens"]
        F4["Serving size and nutrition label"]
        F5["Source and last updated time"]
        F1 --> F2 --> F3 --> F4 --> F5
    end
```
## Account / Sign In

```mermaid
flowchart TB
    subgraph Account["Account / Sign In"]
        direction TB
        A1["Header: Account"]
        A2["Account features: favorites and preferences"]
        A3["Sign-in controls: method to be confirmed"]
        A4["Sign in"]
        A5["Continue browsing menus and locations"]
        A6["Navigation: Home / Map / Favorites / Account"]
        A1 --> A2 --> A3 --> A4 --> A5 --> A6
    end
```

**Behavior:** This diagram shows the signed-out layout.
Sign-in success returns to the requested account feature, or opens
Profile / Preferences when Account was the entry point.
Continue browsing opens Home.
Signed-in users opening Account see Profile / Preferences.
Menus and locations remain browsable without signing in.

## Campus Map

```mermaid
flowchart TB
    subgraph Map["Campus Map"]
        direction TB
        M1["Header: campus selector and notification bell"]
        M2["Location search and category filters"]
        M3["Campus map with dining location markers"]
        M4["Use my location and map controls"]
        M5["Selected location: name, hours and busyness"]
        M6["View location details"]
        M7["Navigation: Home / Map / Favorites / Account"]
        M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7
    end
```

**Behavior:** Search and category filters update the visible markers.
Categories match Home: Café / Dining Hall / Blue Wall /Restaurant.
Selecting a marker reveals the location preview and its details link.
Distance appears only when a user position is available.
Use my location requests permission when selected.
Without permission, show the selected campus and keep browsing available.

## Notifications

```mermaid
flowchart TB
    subgraph Notifications["Notifications"]
        direction TB
        N1["Header: Notifications and back button"]
        N2["Tabs: News and Events / Food Notifications"]
        N3["Notification list for the selected tab"]
        N4["Each item: title, date and read status"]
        N5["Item destination: event, food or location details"]
        N6["Notification settings link"]
        N7["Navigation: Home / Map / Favorites / Account"]
        N1 --> N2 --> N3 --> N4 --> N5 --> N6 --> N7
    end
```

**Behavior:** Tabs show alternative lists. Opening an item goes to the
relevant event, food, or location details screen.
Read/unread indicators can be optional.
Notification settings opens the notification controls within
Profile / Preferences. If those controls require an account,
show the sign-in entry first.

## Favorites

```mermaid
flowchart TB
    subgraph Favorites["Favorites"]
        direction TB
        FV1["Header: Favorites and notification bell"]
        FV2["Tabs: Locations / Foods"]
        FV3["Favorite cards for the selected tab"]
        FV4["Hours or serving information, by item type"]
        FV5["Open details and remove favorite"]
        FV6["Navigation: Home / Map / Favorites / Account"]
        FV1 --> FV2 --> FV3 --> FV4 --> FV5 --> FV6
    end
```

**Behavior:** Show cards for the selected tab. Location cards show name, hours, open/closed status, and busyness. Food cards show name and available serving locations, dates, and meal times.
Opening a card goes to its existing details screen.
Removing a favorite updates the list and reports a failure if the change cannot be saved.
