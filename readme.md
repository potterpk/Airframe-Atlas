# Airframe Atlas

An interactive atlas of airliner history: lineage, specifications, and true-scale three-view outlines across a set of focused pages.

## Pages
- **Explore (`index.html`).** Atlas overview and featured aircraft.
- **Lineage (`timeline.html`).** Search and filter the aircraft timeline.
- **Aircraft (`aircraft.html#b747`).** Specifications, stories, lineage, and three-view outlines.
- **Compare (`compare.html`).** Compare two aircraft and save pairs to the local database.


## Features
- **Lineage chart.** 40 airliners from the Boeing 247 (1933) to the 777X. Each bar runs from first flight to end of production, with entry-into-service markers and arrows showing which design led to which.
- **Spec sheets.** Dates, build counts, dimensions, seats, range, cruise speed, engines and a short history for each type.
- **Blueprint panel.** Plan, side and front outlines generated from published dimensions. Every aircraft is drawn at the same scale; the Compare page overlays a second aircraft in all three views and compares length, wingspan and height side by side.
- **Archive links.** Searches for public-domain three-view drawings on Wikimedia Commons and NASA's Technical Reports Server.
- Filter by manufacturer, search, and deep links (e.g. `aircraft.html#b747`).
- Light and dark themes.
- **Local backend.** A Python standard-library server provides a SQLite-backed API for saving and removing comparison pairs.

## Run it
The front end has no build step or dependencies. To enable the local API and save comparisons, install Python 3.10+ and run:

```powershell
python server.py
```

Then open `http://127.0.0.1:8000/`. Saved comparisons are stored locally in `data/atlas.sqlite3`; the server binds to localhost by default. To run the backend tests:

```powershell
python -m unittest discover -s tests -v
```

The API exposes `GET /api/health`, `GET /api/comparisons`, `POST /api/comparisons`, and `DELETE /api/comparisons/{id}`.

For static hosting, the atlas pages still work, but saved comparisons require the Python server. Shared aircraft data, drawings, and styles live in `aircraft-data.js`, `aircraft-drawings.js`, and `styles.css`.

## Notes
The outlines are approximations for comparison, not engineering drawings. Specs are typical published figures for the variant named on each sheet. Where a figure wasn't verified, it's shown as "-".
