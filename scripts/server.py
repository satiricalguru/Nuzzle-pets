#!/usr/bin/env python3
"""
server.py — Zero-Dependency Live Agent Event Bridge & Studio Server for Nuzzle.

Features:
1. High-performance static HTTP file server for Nuzzle Studio UI.
2. Inbound Webhook Receiver: Handles POST /events from AI agent hooks (Codex, Claude Code, Cursor, etc.).
3. Real-Time Server-Sent Events (SSE): Streams incoming agent lifecycle events live to all open browser tabs (GET /events/stream).
4. Zero External Dependencies: Pure Python 3 standard library.
"""

import sys
import json
import queue
import socket
import threading
from pathlib import Path
from socketserver import ThreadingMixIn
from http.server import HTTPServer, SimpleHTTPRequestHandler

WORKSPACE_DIR = Path(__file__).resolve().parents[1]

clients_lock = threading.Lock()
clients = set()

def broadcast_event(event_payload: dict):
    """Broadcast an event payload to all active SSE subscribers."""
    raw = json.dumps(event_payload)
    chunk = f"data: {raw}\n\n".encode("utf-8")
    with clients_lock:
        active_clients = list(clients)
        for q in active_clients:
            try:
                q.put_nowait(chunk)
            except (queue.Full, Exception):
                pass
    return len(active_clients)

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class NuzzleBridgeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WORKSPACE_DIR), **kwargs)

    def log_message(self, format, *args):
        # Suppress routine GET logs for clean console, keep errors and POST logs
        if self.command == "POST" or (args and "50" in str(args[0])):
            super().log_message(format, *args)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")

        # Health endpoint
        if clean_path in ("/health", "/api/health"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with clients_lock:
                subscriber_count = len(clients)
            self.wfile.write(json.dumps({
                "status": "ok",
                "service": "nuzzle-companion-studio",
                "subscribers": subscriber_count
            }).encode("utf-8"))
            return

        # Server-Sent Events stream endpoint
        if clean_path in ("/events/stream", "/events"):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache, no-transform")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            client_queue = queue.Queue(maxsize=100)
            with clients_lock:
                clients.add(client_queue)

            try:
                # Send initial greeting
                self.wfile.write(b": nuzzle-sse-connected\n\n")
                self.wfile.flush()

                while True:
                    try:
                        chunk = client_queue.get(timeout=15)
                        self.wfile.write(chunk)
                        self.wfile.flush()
                    except queue.Empty:
                        # Keepalive comment
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with clients_lock:
                    clients.discard(client_queue)
            return

        # Default: Serve static assets
        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path in ("", "/events", "/api/events", "/event", "/webhook"):
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(length).decode("utf-8", errors="ignore")
                payload = json.loads(raw_body) if raw_body else {}
            except Exception as exc:
                payload = {"type": "tool", "title": "Agent event received", "sub": str(exc)}

            delivered = broadcast_event(payload)
            print(f"⚡ [Event Ingested] {payload.get('agent', 'Agent')} -> {payload.get('title', payload.get('type', 'event'))} (sent to {delivered} tabs)")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "delivered_to": delivered,
                "event": payload
            }).encode("utf-8"))
            return

        self.send_error(404, f"Endpoint {self.path} not found")

def main():
    port = 4173
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    # Check port availability
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", port))
        s.close()
    except OSError:
        s.close()
        print(f"⚠️ Port {port} is occupied. Finding an available port...")
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
        s.close()

    server = ThreadedHTTPServer(("127.0.0.1", port), NuzzleBridgeHandler)
    print("=" * 65)
    print(f"🐾 Nuzzle Companion Studio & Live Agent Event Bridge")
    print(f"   • Studio UI:         http://127.0.0.1:{port}")
    print(f"   • Inbound Webhook:   http://127.0.0.1:{port}/events (POST)")
    print(f"   • Realtime Stream:   http://127.0.0.1:{port}/events/stream (SSE)")
    print("=" * 65)
    print("Listening for browser tabs and incoming agent events... (Ctrl+C to stop)\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
