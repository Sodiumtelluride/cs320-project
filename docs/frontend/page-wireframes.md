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