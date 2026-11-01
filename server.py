#!/usr/bin/env python3
"""Local web server and saved-comparison API for Airframe Atlas."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "data" / "atlas.sqlite3"
AIRCRAFT_DATA = ROOT / "aircraft-data.js"
AIRCRAFT_IDS = set(re.findall(r'\bid:"([a-z0-9]+)"', AIRCRAFT_DATA.read_text(encoding="utf-8")))
MAX_REQUEST_BYTES = 4096


def initialize_database(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path)) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_comparisons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                left_aircraft TEXT NOT NULL,
                right_aircraft TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


class AtlasHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], database_path: Path = DATABASE):
        self.database_path = Path(database_path)
        initialize_database(self.database_path)
        super().__init__(address, AtlasRequestHandler)


class AtlasRequestHandler(SimpleHTTPRequestHandler):
    server: AtlasHTTPServer

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        content_length = self.headers.get("Content-Length")
        if content_length is None:
            raise ValueError("Content-Length is required.")
        try:
            size = int(content_length)
        except ValueError as error:
            raise ValueError("Content-Length must be a number.") from error
        if size < 0:
            raise ValueError("Content-Length must not be negative.")
        if size > MAX_REQUEST_BYTES:
            raise OverflowError("Request body is too large.")
        if self.headers.get_content_type() != "application/json":
            raise ValueError("Content-Type must be application/json.")
        payload = json.loads(self.rfile.read(size))
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object.")
        return payload

    def _comparison_id(self) -> int | None:
        match = re.fullmatch(r"/api/comparisons/([1-9][0-9]*)", urlsplit(self.path).path)
        return int(match.group(1)) if match else None

    def _handle_api_get(self, path: str) -> None:
        if path == "/api/health":
            self._send_json(200, {"status": "ok"})
            return
        if path == "/api/comparisons":
            with closing(sqlite3.connect(self.server.database_path)) as connection:
                connection.row_factory = sqlite3.Row
                rows = connection.execute(
                    """
                    SELECT id, left_aircraft, right_aircraft, created_at
                    FROM saved_comparisons
                    ORDER BY id DESC
                    """
                ).fetchall()
            self._send_json(200, [dict(row) for row in rows])
            return
        self._send_json(404, {"error": "API endpoint not found."})

    def _handle_api_post(self, path: str) -> None:
        if path != "/api/comparisons":
            self._send_json(404, {"error": "API endpoint not found."})
            return
        try:
            payload = self._read_json()
        except OverflowError as error:
            self._send_json(413, {"error": str(error)})
            return
        except (ValueError, json.JSONDecodeError) as error:
            self._send_json(400, {"error": str(error) or "Invalid JSON request."})
            return

        left = payload.get("left_aircraft")
        right = payload.get("right_aircraft")
        if not isinstance(left, str) or left not in AIRCRAFT_IDS:
            self._send_json(400, {"error": "Choose a known first aircraft."})
            return
        if not isinstance(right, str) or right not in AIRCRAFT_IDS:
            self._send_json(400, {"error": "Choose a known second aircraft."})
            return
        if left == right:
            self._send_json(400, {"error": "Choose two different aircraft."})
            return

        created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with closing(sqlite3.connect(self.server.database_path)) as connection:
            cursor = connection.execute(
                """
                INSERT INTO saved_comparisons (left_aircraft, right_aircraft, created_at)
                VALUES (?, ?, ?)
                """,
                (left, right, created_at),
            )
            comparison_id = cursor.lastrowid
            connection.commit()
        self._send_json(
            201,
            {
                "id": comparison_id,
                "left_aircraft": left,
                "right_aircraft": right,
                "created_at": created_at,
            },
        )

    def _handle_api_delete(self, path: str) -> None:
        comparison_id = self._comparison_id()
        if comparison_id is None:
            self._send_json(404, {"error": "Saved comparison not found."})
            return
        with closing(sqlite3.connect(self.server.database_path)) as connection:
            cursor = connection.execute(
                "DELETE FROM saved_comparisons WHERE id = ?", (comparison_id,)
            )
            connection.commit()
            connection.commit()
        if cursor.rowcount == 0:
            self._send_json(404, {"error": "Saved comparison not found."})
            return
        self._send_json(200, {"deleted": comparison_id})

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path.startswith("/api/"):
            self._handle_api_get(path)
            return
        super().do_GET()

    def do_POST(self) -> None:
        path = urlsplit(self.path).path
        if path.startswith("/api/"):
            self._handle_api_post(path)
            return
        self._send_json(404, {"error": "Endpoint not found."})

    def do_DELETE(self) -> None:
        path = urlsplit(self.path).path
        if path.startswith("/api/"):
            self._handle_api_delete(path)
            return
        self._send_json(404, {"error": "Endpoint not found."})


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Airframe Atlas local web server.")
    parser.add_argument("--host", default="127.0.0.1", help="Interface to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    args = parser.parse_args()
    server = AtlasHTTPServer((args.host, args.port))
    print(f"Airframe Atlas running at http://{args.host}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Airframe Atlas.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
