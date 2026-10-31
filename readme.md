# Airframe Atlas

An interactive atlas of airliner history: lineage, specs and true-scale three-view outlines, all in one page.

## Features
- **Lineage chart.** 40 airliners from the Boeing 247 (1933) to the 777X. Each bar runs from first flight to end of production, with entry-into-service markers and arrows showing which design led to which.
- **Spec sheets.** Dates, build counts, dimensions, seats, range, cruise speed, engines and a short history for each type.
- **Blueprint panel.** Plan, side and front outlines generated from published dimensions. Every aircraft is drawn at the same scale, and you can overlay one aircraft on another to compare them.
- **Archive links.** Searches for public-domain three-view drawings on Wikimedia Commons and NASA's Technical Reports Server.
- Filter by manufacturer, search, and deep links (e.g. `index.html#b747`).
- Light and dark themes.

## Run it
No build step and no dependencies. Open `index.html` in a browser, or enable GitHub Pages on the repo (Settings → Pages → deploy from branch).

## Adding an aircraft
Add an object to the `A` array in `index.html`. Key fields:

| Field | Meaning |
|---|---|
| `id`, `g` | Unique id; group (`boeing`, `douglas`, `airbus`, …) |
| `ff`, `eis`, `end` | First flight date, service-entry year, production-end year (`null` if ongoing) |
| `st` | `prod`, `cert`, `ended` or `retired` |
| `len`, `span`, `h`, `dia` | Length, span, height, fuselage width (metres) |
| `sw` | Wing leading-edge sweep (degrees) |
| `lay` | Engine layout: `wing2`, `wing4`, `rear2`, `tri727`, `tric`, `prop2`, `prop4`, `buried4`, `concorde` |
| `tt`, `hump`, `trifin`, `fold` | T-tail, 747-style hump, triple tail, folded span |
| `pred` | `[[id, "d" or "i"]]`: direct derivative or shared parts/concept |

## Notes
The outlines are approximations for comparison, not engineering drawings. Specs are typical published figures for the variant named on each sheet. Where a figure wasn't verified, it's shown as "—".
