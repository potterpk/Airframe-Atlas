import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from server import AtlasHTTPServer


class AtlasApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = Path(self.temp_dir.name) / "atlas.sqlite3"
        self.server = AtlasHTTPServer(("127.0.0.1", 0), self.database)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def request(self, method, path, payload=None):
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        request = Request(
            self.base_url + path,
            data=body,
            method=method,
            headers={"Content-Type": "application/json"} if body is not None else {},
        )
        try:
            response = urlopen(request, timeout=3)
        except HTTPError as error:
            with error:
                return error.code, json.loads(error.read())
        with response:
            content = response.read()
            return response.status, json.loads(content) if content else None

    def test_health_and_static_site_are_served(self):
        status, payload = self.request("GET", "/api/health")
        self.assertEqual((status, payload), (200, {"status": "ok"}))
        with urlopen(self.base_url + "/", timeout=3) as response:
            self.assertEqual(response.status, 200)
            self.assertIn(b"Airframe Atlas", response.read())

    def test_saved_comparisons_can_be_created_listed_and_deleted(self):
        status, created = self.request(
            "POST",
            "/api/comparisons",
            {"left_aircraft": "b747", "right_aircraft": "a380"},
        )
        self.assertEqual(status, 201)
        self.assertEqual(created["left_aircraft"], "b747")
        self.assertEqual(created["right_aircraft"], "a380")

        status, comparisons = self.request("GET", "/api/comparisons")
        self.assertEqual(status, 200)
        self.assertEqual(comparisons[0]["id"], created["id"])

        status, deleted = self.request("DELETE", f"/api/comparisons/{created['id']}")
        self.assertEqual((status, deleted), (200, {"deleted": created["id"]}))
        self.assertEqual(self.request("GET", "/api/comparisons"), (200, []))

    def test_saved_comparison_survives_server_restart(self):
        status, created = self.request(
            "POST",
            "/api/comparisons",
            {"left_aircraft": "b747", "right_aircraft": "a380"},
        )
        self.assertEqual(status, 201)

        self.server.shutdown()
        self.thread.join(timeout=2)
        self.server.server_close()
        self.server = AtlasHTTPServer(("127.0.0.1", 0), self.database)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

        status, comparisons = self.request("GET", "/api/comparisons")
        self.assertEqual(status, 200)
        self.assertEqual(comparisons[0]["id"], created["id"])

    def test_invalid_aircraft_and_identical_pair_are_rejected(self):
        for pair in (
            {"left_aircraft": "not-a-plane", "right_aircraft": "a380"},
            {"left_aircraft": "b747", "right_aircraft": "b747"},
        ):
            with self.subTest(pair=pair):
                status, payload = self.request("POST", "/api/comparisons", pair)
                self.assertEqual(status, 400)
                self.assertIn("error", payload)

    def test_invalid_content_type_and_oversized_body_are_rejected(self):
        requests = (
            Request(
                self.base_url + "/api/comparisons",
                data=b"{}",
                method="POST",
                headers={"Content-Type": "text/plain"},
            ),
            Request(
                self.base_url + "/api/comparisons",
                data=b" " * 4097,
                method="POST",
                headers={"Content-Type": "application/json"},
            ),
        )
        for request, expected_status in zip(requests, (400, 413)):
            with self.subTest(expected_status=expected_status):
                try:
                    response = urlopen(request, timeout=3)
                except HTTPError as error:
                    with error:
                        status, payload = error.code, json.loads(error.read())
                else:
                    with response:
                        status, payload = response.status, json.loads(response.read())
                self.assertEqual(status, expected_status)
                self.assertIn("error", payload)

    def test_missing_comparison_returns_not_found(self):
        status, payload = self.request("DELETE", "/api/comparisons/999")
        self.assertEqual(status, 404)
        self.assertIn("error", payload)


if __name__ == "__main__":
    unittest.main()
