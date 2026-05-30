"""Helpers for local development networking (physical devices on LAN)."""

from __future__ import annotations

import socket


def get_lan_ipv4_addresses() -> list[str]:
    """Best-effort list of private IPv4 addresses for this machine."""
    candidates: list[str] = []
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127."):
                candidates.append(ip)
    except OSError:
        pass

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if ip and not ip.startswith("127."):
                candidates.append(ip)
    except OSError:
        pass

    seen: set[str] = set()
    ordered: list[str] = []
    for ip in candidates:
        if ip in seen:
            continue
        seen.add(ip)
        ordered.append(ip)
    return ordered


def primary_lan_ip() -> str:
    addresses = get_lan_ipv4_addresses()
    return addresses[0] if addresses else "127.0.0.1"
