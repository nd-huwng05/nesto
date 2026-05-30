from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status


class NotFoundException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Resource not found.'
    default_code = 'not_found'


class BadRequestException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Bad request.'
    default_code = 'bad_request'


class ForbiddenException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'forbidden'


class ConflictException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Resource already exists.'
    default_code = 'conflict'


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        payload = response.data
        if isinstance(payload, dict):
            payload = dict(payload)
            payload['status_code'] = response.status_code
            if hasattr(exc, 'default_code'):
                payload.setdefault('code', exc.default_code)
            if 'detail' not in payload and len(payload) > 1:
                field_errors = {k: v for k, v in payload.items() if k not in ('status_code', 'code')}
                if field_errors:
                    payload['detail'] = field_errors
            response.data = payload
        else:
            response.data = {
                'detail': payload,
                'status_code': response.status_code,
            }
            if hasattr(exc, 'default_code'):
                response.data['code'] = exc.default_code

    return response


class APIExceptionService:
    """DRF exception types and global handler."""

    NotFoundException = NotFoundException
    BadRequestException = BadRequestException
    ForbiddenException = ForbiddenException
    ConflictException = ConflictException
    custom_exception_handler = staticmethod(custom_exception_handler)
