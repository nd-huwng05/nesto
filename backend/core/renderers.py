from rest_framework.renderers import JSONRenderer


class EnvelopeJSONRenderer(JSONRenderer):
    """Compatibility renderer referenced by settings.

    Keep default JSON behavior to avoid changing existing API payloads.
    """
