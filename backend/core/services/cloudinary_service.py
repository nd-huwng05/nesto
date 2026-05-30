"""Enterprise Cloudinary media ingestion and URL resolution."""

from __future__ import annotations

import cloudinary.uploader

DEFAULT_PLACEHOLDER = ""
CLOUDINARY_HTTP_PREFIX = "https://res.cloudinary.com/"


class CloudinaryMediaService:
    """Single responsibility: upload remote assets and resolve secure HTTPS URLs."""

    @staticmethod
    def is_http_url(value: str | None) -> bool:
        text = str(value or "").strip()
        return text.lower().startswith(("http://", "https://"))

    @classmethod
    def upload_remote_url(cls, url: str, *, folder: str) -> dict | None:
        if not cls.is_http_url(url):
            return None
        try:
            return cloudinary.uploader.upload(url, folder=folder)
        except Exception:
            return None

    @classmethod
    def ingest_url(cls, url: str, *, folder: str) -> str | None:
        """Return Cloudinary public_id for storage on CloudinaryField."""
        uploaded = cls.upload_remote_url(url, folder=folder)
        public_id = (uploaded or {}).get("public_id")
        return str(public_id).strip() if public_id else None

    @staticmethod
    def resolve_field_url(field_value, *, placeholder: str = DEFAULT_PLACEHOLDER) -> str | None:
        """Resolve CloudinaryField (or compatible) to absolute HTTPS URL."""
        if not field_value:
            return placeholder or None
        try:
            url = getattr(field_value, "url", None)
            if callable(url):
                url = url()
            url = str(url or "").strip()
            if url.startswith(("http://", "https://")):
                return url
        except Exception:
            pass
        return placeholder or None

    @classmethod
    def resolve_json_gallery(cls, items, *, placeholder: str = DEFAULT_PLACEHOLDER) -> list[str]:
        """Normalize JSON gallery entries to HTTPS URL strings."""
        if not isinstance(items, list):
            return []
        normalized: list[str] = []
        for item in items:
            if isinstance(item, str):
                text = item.strip()
                if cls.is_http_url(text):
                    normalized.append(text)
                elif text:
                    normalized.append(text)
            elif isinstance(item, dict):
                url = str(item.get("secure_url") or item.get("url") or "").strip()
                if url:
                    normalized.append(url)
        return normalized or ([placeholder] if placeholder else [])

    @classmethod
    def resolve_legacy_url(cls, value: str | None, *, placeholder: str = DEFAULT_PLACEHOLDER) -> str | None:
        text = str(value or "").strip()
        if cls.is_http_url(text):
            return text
        return placeholder or None
