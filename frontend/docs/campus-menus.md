# Campus menus

Home and `/menus` retain the four dining halls and add two category cards. `/menus?category=grab-n-go` lists four takeaway locations; `/menus?category=around-campus` lists the sixteen cafés and stores included in the reference screenshots. A location opens at `/menus?hall=<location-id>`. Its description and menu appear together.

## Data loading

The existing `NEXT_PUBLIC_MENU_API_BASE_URL` setting selects the backend for both dining halls and campus locations. The service must support the menu contract in [menu-api.md](menu-api.md):

| Request | Parameters |
| --- | --- |
| `GET <base>/menus` | `diningHallId`, `date`, `meal` |
| `GET <base>/foods/<foodId>` | `diningHallId`, `date`, `meal` |

`diningHallId` is retained for compatibility and identifies any dining location. The identifiers below are frontend configuration; confirm or map them to the backend's identifiers before connecting the service. `daily-offerings` extends the existing meal identifiers for café menus. Availability is configurable per location and should be updated when the backend's supported sections are confirmed.

Without an API base URL, new locations request `/api/menu-pending/menus`. It validates the selection and returns the selected identifiers with `stations: []` and `updatedAt: null`. It supplies no food, price, nutrition or allergen records. The corresponding food-details endpoint returns 404. Existing dining hall demo routes are unchanged. A failed live request remains an error and does not fall back to sample data.

Menu and food-detail responses retain the existing fields. A food may additionally include `price`, a display string such as a formatted amount, or null. Omit it when unavailable. All food rows remain selectable and use the existing food-details dialog, nutrition label and dietary-tag components.

## Locations and menu sections

| Category | Frontend identifier | Location | Menu sections |
| --- | --- | --- | --- |
| Grab ’n Go | `berkshire-grab-n-go` | Berkshire Grab ’n Go | breakfast, lunch |
| Grab ’n Go | `worcester-grab-n-go` | Worcester Grab ’n Go | breakfast, lunch |
| Grab ’n Go | `hampshire-grab-n-go` | Hampshire Grab ’n Go | breakfast |
| Grab ’n Go | `franklin-grab-n-go` | Franklin Grab ’n Go | lunch |
| Around Campus | `whitmore-cafe` | Whitmore Café | grab-n-go, daily-offerings |
| Around Campus | `procrastination-station` | Procrastination Station | grab-n-go, daily-offerings |
| Around Campus | `courtside-cafe` | Courtside Café | grab-n-go, daily-offerings |
| Around Campus | `worcester-cafe` | Worcester Café | daily-offerings |
| Around Campus | `isb-cafe` | ISB Café | grab-n-go |
| Around Campus | `hampshire-cafe` | Hampshire Café | grab-n-go |
| Around Campus | `roots-cafe` | Roots Café | breakfast, lunch, dinner, grab-n-go |
| Around Campus | `morrill-cafe` | Morrill Café | grab-n-go |
| Around Campus | `peets-coffee-tea` | Peet’s Coffee & Tea | grab-n-go, daily-offerings |
| Around Campus | `the-hub` | The Hub | grab-n-go |
| Around Campus | `argo-tea` | Argo Tea | daily-offerings |
| Around Campus | `newman-cafe` | Newman Café | lunch |
| Around Campus | `snack-overflow` | Snack Overflow | grab-n-go |
| Around Campus | `post-and-bean-cafe` | Post & Bean Café | grab-n-go |
| Around Campus | `carney-cafe` | Carney Café | grab-n-go, daily-offerings |
| Around Campus | `terrace` | Terrace | breakfast, lunch, dinner |

## Reference and verification

Location descriptions are brief paraphrases of the supplied screenshots and [UMass Dining's Grab ’n Go](https://www.umassdining.com/locations-menus/grab-n-go) and [Around Campus](https://www.umassdining.com/locations-menus/around-campus) directories. Menu-section configuration follows the linked location menus. Argo Tea uses Daily Offerings to represent its undivided menu. Operating hours and daily food availability are not copied into static configuration. No location photographs are included.

The extension reuses the shared layout, navigation, authentication, Button and Dialog. It requires no additional packages. Tests in `tests/menus/campus-menus.test.tsx` cover category navigation, blank HTTP responses, selection changes and rendering populated responses supplied by a test-only service. Those test records are not application menu data.
