from rest_framework.renderers import JSONRenderer
from rest_framework.utils.serializer_helpers import ReturnList, ReturnDict


def _first_message_from_data(data):
    if data is None:
        return ''
    if isinstance(data, str):
        return data
    if isinstance(data, (list, tuple, ReturnList)):
        if len(data) == 0:
            return ''
        return _first_message_from_data(data[0])
    if isinstance(data, (dict, ReturnDict)):
        for v in data.values():
            return _first_message_from_data(v)
    return str(data)

class EnvelopeJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        if renderer_context is None:
            return super().render(data, accepted_media_type, renderer_context)

        response = renderer_context.get('response')
        if response is None:
            return super().render(data, accepted_media_type, renderer_context)

        content_type = response.get('Content-Type', '')
        if content_type and 'application/json' not in content_type:
            return super().render(data, accepted_media_type, renderer_context)

        if isinstance(data, dict) and {'status', 'message', 'data'}.issubset(set(data.keys())):
            return super().render(data, accepted_media_type, renderer_context)

        status_code = getattr(response, 'status_code', 200)
        is_success = 200 <= status_code < 400

        if is_success:
            message = 'OK'
            envelope = {
                'status': 'success',
                'message': message,
                'data': data if data is not None else None
            }
        else:
            message = ''
            if isinstance(data, dict):
                if 'detail' in data:
                    message = data.get('detail') or ''
                else:
                    message = _first_message_from_data(data)
            else:
                message = _first_message_from_data(data)
            envelope = {
                'status': 'error',
                'message': message or 'Error',
                'data': data if data is not None else None
            }

        return super().render(envelope, accepted_media_type, renderer_context)
