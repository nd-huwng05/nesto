from datetime import date

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.views import APIView


def _as_date(value):
    if isinstance(value, date):
        return value
    text = str(value or '').strip()
    if not text:
        return None
    if 'T' in text:
        text = text.split('T', 1)[0]
    try:
        year, month, day = [int(part) for part in text.split('-')]
        return date(year, month, day)
    except Exception:
        return None


BRANCH_FIXTURES = [
    {
        'id': 'branch-hcm-01',
        'name': 'Nesto Ho Chi Minh Center',
        'city': 'Ho Chi Minh',
        'is_active': True,
    },
    {
        'id': 'branch-hn-01',
        'name': 'Nesto Hanoi Lake View',
        'city': 'Hanoi',
        'is_active': True,
    },
]

ROOM_TYPE_FIXTURES = [
    {'id': 'room-standard', 'branch': 'branch-hcm-01', 'name': 'Standard Room', 'base_price': 90, 'is_active': True},
    {'id': 'room-vip', 'branch': 'branch-hcm-01', 'name': 'VIP Room', 'base_price': 150, 'is_active': True},
    {'id': 'room-super-vip', 'branch': 'branch-hn-01', 'name': 'Super VIP Room', 'base_price': 240, 'is_active': True},
]

ROOM_FIXTURES = [
    {'id': 'RTH-01', 'branch': 'branch-hcm-01', 'room_type': 'room-standard', 'name': 'Standard Room 01'},
    {'id': 'RTH-02', 'branch': 'branch-hcm-01', 'room_type': 'room-standard', 'name': 'Standard Room 02'},
    {'id': 'RVP-01', 'branch': 'branch-hcm-01', 'room_type': 'room-vip', 'name': 'VIP Room 01'},
    {'id': 'RSV-01', 'branch': 'branch-hn-01', 'room_type': 'room-super-vip', 'name': 'Super VIP Room 01'},
]

SERVICE_CATEGORY_FIXTURES = [
    {'id': 'cat-transfer', 'name': 'Transfer', 'is_active': True},
    {'id': 'cat-food', 'name': 'Food', 'is_active': True},
]

EXTRA_SERVICE_FIXTURES = [
    {'id': 'airport_shuttle', 'branch': 'branch-hcm-01', 'name': 'Airport Shuttle', 'price': 20, 'is_active': True},
    {'id': 'breakfast_combo', 'branch': 'branch-hcm-01', 'name': 'Breakfast Combo', 'price': 8, 'is_active': True},
    {'id': 'late_checkout', 'branch': 'branch-hn-01', 'name': 'Late Checkout', 'price': 15, 'is_active': True},
]


class BranchSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    city = serializers.CharField()
    is_active = serializers.BooleanField()


class RoomTypeSerializer(serializers.Serializer):
    id = serializers.CharField()
    branch = serializers.CharField()
    name = serializers.CharField()
    base_price = serializers.IntegerField()
    is_active = serializers.BooleanField()


class RoomAvailabilitySerializer(serializers.Serializer):
    id = serializers.CharField()
    branch = serializers.CharField()
    room_type = serializers.CharField()
    name = serializers.CharField()
    available = serializers.BooleanField()
    check_in = serializers.CharField(allow_null=True)
    check_out = serializers.CharField(allow_null=True)


class ExtraServiceSerializer(serializers.Serializer):
    id = serializers.CharField()
    branch = serializers.CharField()
    name = serializers.CharField()
    price = serializers.IntegerField()
    is_active = serializers.BooleanField()


class ServiceCategorySerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    is_active = serializers.BooleanField()


class BranchListAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = BranchSerializer

    @extend_schema(
        tags=['Catalog'],
        operation_id='catalog_branches_list',
        summary='List branches (compat)',
        description='Compatibility endpoint for FE booking flow.',
        auth=[],
        responses={200: BranchSerializer(many=True)},
    )
    def get(self, request):
        is_active = str(request.query_params.get('is_active') or '').strip().lower()
        if is_active in {'1', 'true', 'yes', 'on'}:
            data = [item for item in BRANCH_FIXTURES if item.get('is_active')]
        else:
            data = BRANCH_FIXTURES
        return Response(data, status=status.HTTP_200_OK)


class BranchDetailAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = BranchSerializer

    @extend_schema(tags=['Catalog'], operation_id='catalog_branch_detail', summary='Get branch detail (compat)', auth=[], responses={200: BranchSerializer})
    def get(self, request, branch_id):
        item = next((x for x in BRANCH_FIXTURES if str(x.get('id')) == str(branch_id)), None)
        if not item:
            return Response({'detail': 'Branch not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(item, status=status.HTTP_200_OK)


class RoomTypeListAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = RoomTypeSerializer

    @extend_schema(
        tags=['Catalog'],
        operation_id='catalog_room_types_list',
        summary='List room types (compat)',
        auth=[],
        parameters=[
            OpenApiParameter('branch', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Branch id'),
            OpenApiParameter('is_active', OpenApiTypes.BOOL, OpenApiParameter.QUERY, description='Active filter'),
        ],
    )
    def get(self, request):
        branch = str(request.query_params.get('branch') or '').strip()
        is_active = str(request.query_params.get('is_active') or '').strip().lower()
        data = ROOM_TYPE_FIXTURES
        if branch:
            data = [item for item in data if str(item.get('branch')) == branch]
        if is_active in {'1', 'true', 'yes', 'on'}:
            data = [item for item in data if item.get('is_active')]
        return Response(data, status=status.HTTP_200_OK)


class RoomAvailabilityAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = RoomAvailabilitySerializer

    @extend_schema(
        tags=['Catalog'],
        operation_id='catalog_room_availability',
        summary='Check room availability (compat)',
        auth=[],
        parameters=[
            OpenApiParameter('branch', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True),
            OpenApiParameter('check_in', OpenApiTypes.DATE, OpenApiParameter.QUERY),
            OpenApiParameter('check_out', OpenApiTypes.DATE, OpenApiParameter.QUERY),
        ],
    )
    def get(self, request):
        branch = str(request.query_params.get('branch') or '').strip()
        check_in = _as_date(request.query_params.get('check_in'))
        check_out = _as_date(request.query_params.get('check_out'))

        data = [item for item in ROOM_FIXTURES if not branch or str(item.get('branch')) == branch]
        response = [
            {
                **item,
                'available': True,
                'check_in': check_in.isoformat() if check_in else None,
                'check_out': check_out.isoformat() if check_out else None,
            }
            for item in data
        ]
        return Response(response, status=status.HTTP_200_OK)


class ExtraServiceListAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = ExtraServiceSerializer

    @extend_schema(tags=['Catalog'], operation_id='catalog_extra_services_list', summary='List extra services (compat)', auth=[], responses={200: ExtraServiceSerializer(many=True)})
    def get(self, request):
        branch = str(request.query_params.get('branch') or '').strip()
        is_active = str(request.query_params.get('is_active') or '').strip().lower()
        data = EXTRA_SERVICE_FIXTURES
        if branch:
            data = [item for item in data if str(item.get('branch')) == branch]
        if is_active in {'1', 'true', 'yes', 'on'}:
            data = [item for item in data if item.get('is_active')]
        return Response(data, status=status.HTTP_200_OK)


class ServiceCategoryListAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = ServiceCategorySerializer

    @extend_schema(tags=['Catalog'], operation_id='catalog_service_categories_list', summary='List service categories (compat)', auth=[], responses={200: ServiceCategorySerializer(many=True)})
    def get(self, request):
        is_active = str(request.query_params.get('is_active') or '').strip().lower()
        data = SERVICE_CATEGORY_FIXTURES
        if is_active in {'1', 'true', 'yes', 'on'}:
            data = [item for item in data if item.get('is_active')]
        return Response(data, status=status.HTTP_200_OK)
