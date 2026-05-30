"""DRF serializer mixins for consistent API representations."""

from __future__ import annotations

from core.services.cloudinary_service import CloudinaryMediaService


class CloudinaryRepresentationMixin:
    """Override to_representation to inject absolute HTTPS media URLs."""

    cloudinary_field_map: dict[str, str] = {}
    cloudinary_gallery_fields: tuple[str, ...] = ()
    cloudinary_legacy_url_fields: dict[str, str] = {}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for response_key, model_attr in self.cloudinary_field_map.items():
            field = getattr(instance, model_attr, None)
            data[response_key] = CloudinaryMediaService.resolve_field_url(field)
        for gallery_key in self.cloudinary_gallery_fields:
            raw = getattr(instance, gallery_key, None)
            data[gallery_key] = CloudinaryMediaService.resolve_json_gallery(raw)
        for response_key, model_attr in self.cloudinary_legacy_url_fields.items():
            data[response_key] = CloudinaryMediaService.resolve_legacy_url(getattr(instance, model_attr, ""))
        return data
