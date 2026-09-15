#!/usr/bin/env python3
"""Regression tests for the local Nuzzle browser bridge."""

import json
import threading
import unittest
import urllib.error
import urllib.request

from server import NuzzleBridgeHandler, ThreadedHTTPServer, validate_event_payload, InvalidEvent


class PayloadValidationTests(unittest.TestCase):
    def test_rejects_non_object_and_empty_payloads(self):
        for payload in ([], "event", None, {}):
            with self.subTest(payload=payload):
                with self.assertRaises(InvalidEvent):
                    validate_event_payload(payload)

    def test_accepts_bounded_event_object(self):
        payload = {"type": "error", "agent": "Codex", "detail": {"exitCode": 1}}
        self.assertIs(validate_event_payload(payload), payload)


class BridgeHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadedHTTPServer(("127.0.0.1", 0), NuzzleBridgeHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def post(self, path, body, *, origin=None, content_type="application/json"):
        headers = {"Content-Type": content_type}
        if origin:
            headers["Origin"] = origin
        request = urllib.request.Request(
            self.base_url + path,
            data=body,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=2) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            with error:
                return error.code, error.read()

    def test_accepts_valid_event_only_on_canonical_endpoint(self):
        body = json.dumps({"type": "tool", "agent": "Codex"}).encode()
        status, response = self.post("/events", body)
        self.assertEqual(status, 200)
        self.assertEqual(response["status"], "ok")

        status, _ = self.post("/webhook", body)
        self.assertEqual(status, 404)

    def test_rejects_malformed_json_instead_of_broadcasting_fake_event(self):
        status, _ = self.post("/events", b"{broken")
        self.assertEqual(status, 400)

    def test_rejects_foreign_browser_origin(self):
        body = json.dumps({"type": "tool"}).encode()
        status, _ = self.post("/events", body, origin="https://attacker.example")
        self.assertEqual(status, 403)

    def test_rejects_a_different_loopback_origin_port(self):
        body = json.dumps({"type": "tool"}).encode()
        status, _ = self.post("/events", body, origin="http://127.0.0.1:1")
        self.assertEqual(status, 403)

    def test_rejects_non_json_content_type(self):
        status, _ = self.post("/events", b"type=tool", content_type="text/plain")
        self.assertEqual(status, 415)


if __name__ == "__main__":
    unittest.main()
