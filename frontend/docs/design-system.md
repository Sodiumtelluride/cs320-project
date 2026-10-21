

# Frontend Design System Research

## 1. Reference Website

Website: https://www.umassdining.com/locations-menus 

Used Chrome DevTools (Elements, Styles, Computed)

## 2. About Existing Website CSS Styles (As a template)

| Element | State | CSS Property | Computed Value(s) | HEX | Notes |
|---|---|---|---|---|---|
| Header | Default | background-color | rgb(0, 0, 0) | #000000 |  |
| Navigation bar | Default | background-color | rgb(136, 28, 27) | #881C1B | The bar containing Meal Plan - Jobs |
| Navigation | Default |Text-color| rgb(255, 255, 255) |#FFFFFF |
| Navigation | Hover |Text-color| rgb(0, 0, 0) |#000000 | rgba(0, 0, 0, 0); border-bottom color rgb(0, 0, 0)|
| Banner heading | Default |Text-color & font| rgb(255, 255, 255) <br> font-family: Oswald, sans-serif; font-size: 60px; font-weight: 500|#FFFFFF  | |
| Navigation link | Default | border-color | rgb(68, 68, 68) |  | Dining hall location options |
| Navigation link | Default | background-color | rgb(255, 255, 255) |  | |
| Navigation link | Default | Text color & font | rgb(148, 39, 57) <br> font-family: Oswald, sans-serif; font-size: 15px; font-weight: 400|  ||
| Navigation link | Hover | Text-color & font | rgb(255, 255, 255) <br> font-family: Oswald, sans-serif; same|  | |
| Navigation link | Hover | background-color | rgb(148, 39, 57) <br> border-bottom-color:rgb(255, 255, 255) |  | |
| Main content | Default | background-color|  rgba(0, 0, 0, 0) |  | |
| Main heading | Default | color | rgb(68, 68, 68) <br> font-family: Oswald, sans-serif | | "About UMass Amherst Dining" text|
| Body text | Default | text-color & font| rgb(68, 68, 68) <br> font-family: "Open-Sans"; font-size: 16px; font-weight: 400|  | |
| Footer links| Default | text-color & font| rgb(254, 254, 254) <br> background-color: rgba(0, 0, 0, 0) <br> font-family: "Open-Sans"; font-size: 15px; font-weight: 400|  ||
| Footer links| Hover | text-color & font| rgb(255, 255, 255) <br> background-color: rgba(0, 0, 0, 0) <br> font-info: same as default|  | text-decoration: underline; solid; left-alignment; <br> color: rgb(255, 255, 255) |
| Buttons | Default | icon | icon color: rgb(0, 0, 0) <br> background-color: rgb(255, 255, 255) <br> border-bottom-color: rgb(0, 0, 0) <br> background-origin: padding-box <br> border radius: 50px <br>height: 34.5px<br>width: 34px<br>font-size: 15px|  | Social media buttons (Both on top and bottom of the page) |
| Buttons | Hover | color | background-color: rgb(136, 28, 28) <br>border-bottom-color: rgb(255, 255, 255)<br> icon color: rgb(255, 255, 255); |  |otherwise same |

## 3. About Page Website Image

| Element | Type | Source | Intrinsic Size | Display Size | Notes |
|---|---|---|---|---|---|
| Header logo | PNG | src="/themes/contrib/umass_dining_new/images/logo.png" | 552x92 | 398x66 | Transparent background |
| About hero | JPEG |  https://www.umassdining.com/sites/default/files/2025-02/10M_0.jpg | 1900x565 | 1440x423 | Dining photograph (under the About Umass Dining texts)|
| Main content image | JPEG |  https://www.umassdining.com/sites/default/files/8095202768_ea3e63136c_c.jpg | 1080x729 | 1050x709 | About section photograph (in the middle of the page) |
| Footer Image Links | JPEG | e.g.:https://www.umassdining.com/sites/default/files/Under%20the%20weather%20footer.png | 640x144 | 545x123 | |

Other info for About hero:
- Hero overlay ::after 
    - background-image: linear-gradient(to bottom, rgb(255 255 255 / 0%) 0%, rgb(0 0 0 / 70%) 100%) | Transparent white to 70% black | Gradient over hero image |
    - background-color: rgba(0, 0, 0, 0) | Transparent | Gradient is provided by background-image |
    - position | absolute | N/A | Positioned over image |
    - width | 100% | N/A | Covers container width |
    - height | 100% | Covers container height |

## 4. Other features (Additional ones on other pages)

### Livestream Button Properties
| Property | Existing Website Value | Notes |
|---|---|---|
| Component Type | Link styled as button | HTML anchor element |
| HTML Element | `<a>` | Clickable external link |
| CSS Class | `.btn-livestream` | Shared livestream button class |
| Purpose | Access dining hall livestreams | Opens YouTube |
| Livestream Locations | Hampshire Commons South and North | Two distinct streams |
| South Link | https://www.youtube.com/watch?v=RprORF_ggOA | External YouTube URL |
| North Link | https://www.youtube.com/watch?v=TWC87AgKJHA | External YouTube URL |
| Link Target | `_blank` | Opens in a new tab/window |
| Background Color | rgb(255, 0, 0) | #FF0000 |
| Text Color | White | #FFFFFF; visually confirmed, console value truncated |
| Font Family | "Open Sans", sans-serif | Computed CSS |
| Font Size | 14px | Computed CSS |
| Font Weight | 400 | Normal |
| Border Radius | 10px | Rounded rectangle |
| Padding | Partially visible: 10px 10px 10px ... | Exact final value truncated |
| Visible Button Width | 340px | Measured using getBoundingClientRect() |
| Visible Button Height | 41px | Measured using getBoundingClientRect() |
| Matching DOM Elements | 4 | Two visible, two zero-size |
| Zero-Size Elements | 2 | 0x0px; possibly hidden responsive copies |
| Animated Indicator | `.beacon::before` | Separate animated pseudo-element |


### Design Observations

- Buttons use consistent typography and rounded corners.
- The links open external YouTube videos rather than playing video inside the button.
- The livestream link design can be implemented later as a reusable React component.

### Animated Beacon Properties

| CSS Property | Computed Value | Description |
|---|---|---|
| Animated Element | `.beacon::before` | Pseudo-element used as animated livestream indicator |
| Width | 42px | Computed width |
| Height | 42px | Computed height |
| Background Color | rgba(0, 0, 0, 0) | Transparent |
| Animation Shorthand | `2s linear infinite active` | Computed CSS |
| Animation Duration | 2s | Two seconds per cycle |
| Animation Timing Function | linear | Constant timing progression |
| Animation Iteration Count | infinite | Repeats continuously |
| Animation Delay | 0s | No initial delay |
| Animation Direction | normal | Normal playback direction |
| Animation Play State | running | Animation active |
| Transform | none | Value observed at inspection time |

### Map
Website: https://www.umassdining.com/locations-menus/hampshire

| Property | Existing Website Value | Notes |
|---|---|---|
| Map Provider | Apple Maps / MapKit JS | Identified through map branding and MapKit DOM elements |
| Outer Container | `#dining_location_map_outer` | Parent HTML element |
| Map Container | `#dining_location_map` | Actual embedded map container |
| Map Container Width | 708px | Measured using getBoundingClientRect() |
| Map Container Height | 250px | Measured using getBoundingClientRect() |
| Map Background Color | rgba(0, 0, 0, 0) | Transparent; map content rendered internally |
| Map Rendering | MapKit-generated elements | Classes include mk-map-node-element |
| Location Marker | Red/pink map pin | Observed in screenshot |
| Visible Location Markers | 1 | At inspected map view |
| Map Style | Standard street map | Observed in screenshot |
| Zoom Controls | Plus and minus buttons | Visible; functionality not independently tested |
| Map Type Control | Visible | Upper-right corner |
| Compass Control | Visible | Lower-right corner |
| Map Attribution | Apple Maps / Legal | Displayed on map |

### Design Observations

- The existing website embeds a map for an individual dining location.
- A location marker identifies the dining commons.
- Map controls and provider attribution are visible.
- The map container is transparent, while MapKit renders the map contents.
- The measured 708x250px size describes the map container at the inspected viewport.
- Future implementation should support location markers, responsive sizing, and relevant map controls.


## 5. Official UMass Brand Reference

Source:
https://www.umass.edu/brand/visual-identity/brand-colors

| Brand Color | Official HEX |
|---|---|
| Maroon | #840028 |
| Black | #212721 |
| Dark Gray | #373A36 |
| Medium Gray | #505759 |
| Light Gray | #A2AAAD |
| Dark Green | #44693D |


