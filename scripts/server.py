#!/usr/bin/env python3
"""Local-only static server and agent event bridge for Nuzzle."""

import json
import queue
import socket
import sys
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from socketserver import ThreadingMixIn
from urllib.parse import urlsplit

WORKSPACE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = WORKSPACE_DIR / "dist" if (WORKSPACE_DIR / "dist").is_dir() else WORKSPACE_DIR
MAX_EVENT_BYTES = 64 * 1024
MAX_JSON_DEPTH = 6
MAX_JSON_ITEMS = 256
MAX_STRING_LENGTH = 8_192

clients_lock = threading.Lock()
clients = set()


class InvalidEvent(ValueError):
    """Raised when an inbound event is unsafe or malformed."""


def validate_event_payload(payload):
    """Validate an event without inventing a replacement for malformed input."""
    if not isinstance(payload, dict):
        raise InvalidEvent("event payload must be a JSON object")
    if not payload:
        raise InvalidEvent("event payload must not be empty")

    item_count = 0

    def visit(value, depth=0):
        nonlocal item_count
        if depth > MAX_JSON_DEPTH:
            raise InvalidEvent("event payload is nested too deeply")
        item_count += 1
        if item_count > MAX_JSON_ITEMS:
            raise InvalidEvent("event payload has too many values")
        if isinstance(value, str):
            if len(value) > MAX_STRING_LENGTH:
                raise InvalidEvent("event payload contains an oversized string")
            return
        if value is None or isinstance(value, (bool, int, float)):
            return
        if isinstance(value, list):
            for entry in value:
                visit(entry, depth + 1)
            return
        if isinstance(value, dict):
            for key, entry in value.items():
                if not isinstance(key, str) or len(key) > 128:
                    raise InvalidEvent("event payload contains an invalid key")
                visit(entry, depth + 1)
            return
        raise InvalidEvent("event payload contains an unsupported value")

    visit(payload)
    return payload


def broadcast_event(event_payload):
    """Broadcast a validated event payload to active SSE subscribers."""
    payload = validate_event_payload(event_payload)
    chunk = f"data: {json.dumps(payload)}\n\n".encode("utf-8")
    with clients_lock:
        active_clients = list(clients)
        for client_queue in active_clients:
            try:
                client_queue.put_nowait(chunk)
            except queue.Full:
                clients.discard(client_queue)
    return len(active_clients)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class NuzzleBridgeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def log_message(self, format, *args):
        if self.command == "POST" or (args and "50" in str(args[0])):
            super().log_message(format, *args)

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _origin_is_allowed(self):
        origin = self.headers.get("Origin")
        if not origin:
            return True
        parsed = urlsplit(origin)
        request = urlsplit(f"//{self.headers.get('Host', '')}")
        loopback_hosts = {"127.0.0.1", "localhost", "::1"}
        origin_port = parsed.port or (443 if parsed.scheme == "https" else 80)
        request_port = request.port or 80
        return (
            parsed.scheme in {"http", "https"}
            and (parsed.hostname or "").lower() in loopback_hosts
            and (request.hostname or "").lower() in loopback_hosts
            and origin_port == request_port
        )

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if not self._origin_is_allowed():
            self.send_error(403, "Cross-origin requests are not allowed")
            return
        self.send_response(204)
        self.send_header("Allow", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        clean_path = urlsplit(self.path).path.rstrip("/")
        if clean_path in ("/health", "/api/health"):
            with clients_lock:
                subscriber_count = len(clients)
            self._send_json(200, {
                "status": "ok",
                "service": "nuzzle-companion-studio",
                "subscribers": subscriber_count,
            })
            return

        if clean_path == "/events/stream":
            if not self._origin_is_allowed():
                self.send_error(403, "Cross-origin requests are not allowed")
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache, no-transform")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            client_queue = queue.Queue(maxsize=100)
            with clients_lock:
                clients.add(client_queue)
            try:
                self.wfile.write(b": nuzzle-sse-connected\n\n")
                self.wfile.flush()
                while True:
                    try:
                        chunk = client_queue.get(timeout=15)
                    except queue.Empty:
                        chunk = b": ping\n\n"
                    self.wfile.write(chunk)
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with clients_lock:
                    clients.discard(client_queue)
            return
        super().do_GET()

    def do_POST(self):
        clean_path = urlsplit(self.path).path.rstrip("/")
        if clean_path != "/events":
            self.send_error(404, f"Endpoint {self.path} not found")
            return
        if not self._origin_is_allowed():
            self.send_error(403, "Cross-origin requests are not allowed")
            return
        if self.headers.get_content_type() != "application/json":
            self._send_json(415, {"status": "error", "error": "Content-Type must be application/json"})
            return
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            length = -1
        if length < 1:
            self._send_json(400, {"status": "error", "error": "A non-empty request body is required"})
            return
        if length > MAX_EVENT_BYTES:
            self._send_json(413, {"status": "error", "error": "Event payload is too large"})
            return
        try:
            raw_body = self.rfile.read(length).decode("utf-8")
            payload = validate_event_payload(json.loads(raw_body))
        except (UnicodeDecodeError, json.JSONDecodeError, InvalidEvent) as exc:
            self._send_json(400, {"status": "error", "error": str(exc)})
            return

        delivered = broadcast_event(payload)
        label = payload.get("title", payload.get("type", payload.get("kind", "event")))
        print(f"⚡ [Event Ingested] {payload.get('agent', 'Agent')} -> {label} (sent to {delivered} tabs)")
        self._send_json(200, {"status": "ok", "delivered_to": delivered})


def choose_port(preferred_port):
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        probe.bind(("127.0.0.1", preferred_port))
        return preferred_port
    except OSError:
        probe.close()
        probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]
    finally:
        probe.close()


def main():
    try:
        preferred_port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    except ValueError:
        raise SystemExit("port must be an integer")
    port = choose_port(preferred_port)
    if port != preferred_port:
        print(f"⚠️ Port {preferred_port} is occupied; using {port}.")
    server = ThreadedHTTPServer(("127.0.0.1", port), NuzzleBridgeHandler)
    print("=" * 65)
    print("🐾 Nuzzle Companion Studio & Live Agent Event Bridge")
    print(f"   • Studio UI:         http://127.0.0.1:{port}")
    print(f"   • Inbound Webhook:   http://127.0.0.1:{port}/events (POST JSON)")
    print(f"   • Realtime Stream:   http://127.0.0.1:{port}/events/stream (SSE)")
    print("=" * 65)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
