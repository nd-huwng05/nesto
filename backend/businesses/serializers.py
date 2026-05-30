from rest_framework import serializers

from businesses.models import Branch, BranchCustomer, Company, Department
from rooms.models import BranchTheme, RoomTheme
from businesses.services.geocode_service import GeocodeService
from rooms.services.customer_theme_service import assign_branch_themes, ensure_customer_themes
from core.services.serializer_mixins import CloudinaryRepresentationMixin
from core.services.cloudinary_service import CloudinaryMediaService


class CompanySerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
    contact = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()

    cloudinary_field_map = {"logo": "logo"}

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "logo",
            "lodging_type",
            "business_type",
            "scale",
            "legal_name",
            "tax_code",
            "legal_representative",
            "contact",
            "created_at",
            "updated_at",
        ]

    def get_contact(self, obj):
        return {
            "email": obj.contact_email,
            "phone": obj.contact_phone,
            "headquarters_address": obj.headquarters_address,
        }

    def get_logo(self, obj):
        return CloudinaryMediaService.resolve_field_url(getattr(obj, "logo", None))

    def create(self, validated_data):
        contact = self.initial_data.get("contact", {}) or {}
        payload = self.initial_data if isinstance(self.initial_data, dict) else {}
        logo_url = payload.get("logo")
        if isinstance(logo_url, str) and CloudinaryMediaService.is_http_url(logo_url):
            public_id = CloudinaryMediaService.ingest_url(logo_url, folder="nesto/company_logos")
            if public_id:
                validated_data["logo"] = public_id
        instance = Company.objects.create(
            manager=self.context["request"].user if self.context.get("request") else None,
            contact_email=contact.get("email", ""),
            contact_phone=contact.get("phone", ""),
            headquarters_address=contact.get(
                "headquarters_address",
                contact.get("headquartersAddress", ""),
            ),
            **validated_data,
        )
        return instance

    def update(self, instance, validated_data):
        contact = self.initial_data.get("contact", None)
        payload = self.initial_data if isinstance(self.initial_data, dict) else {}
        logo_url = payload.get("logo")
        if isinstance(logo_url, str) and CloudinaryMediaService.is_http_url(logo_url):
            public_id = CloudinaryMediaService.ingest_url(logo_url, folder="nesto/company_logos")
            if public_id:
                validated_data["logo"] = public_id
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if isinstance(contact, dict):
            instance.contact_email = contact.get("email", instance.contact_email)
            instance.contact_phone = contact.get("phone", instance.contact_phone)
            instance.headquarters_address = contact.get(
                "headquarters_address",
                contact.get("headquartersAddress", instance.headquarters_address),
            )
        instance.save()
        return instance


class BranchSerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
    business_id = serializers.UUIDField(source="company_id", read_only=True)
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.none(), required=False, allow_null=True)
    room_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()
    contact = serializers.SerializerMethodField()
    billing = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    cloudinary_field_map = {"image": "image"}
    cloudinary_gallery_fields = ("images",)

    class Meta:
        model = Branch
        fields = [
            "id",
            "business_id",
            "company",
            "name",
            "lodging_type",
            "address",
            "phone",
            "email",
            "contact",
            "amenities",
            "guest_segments",
            "image",
            "images",
            "billing",
            "is_active",
            "room_count",
            "staff_count",
            "created_at",
            "updated_at",
        ]

    def get_room_count(self, obj):
        return obj.rooms.count()

    def get_staff_count(self, obj):
        return obj.staff_profiles.count()

    def get_contact(self, obj):
        return {"phone": obj.phone, "email": obj.email}

    def get_billing(self, obj):
        return {"bank_name": obj.bank_name, "account_number": obj.bank_account_number}

    def get_image(self, obj):
        return CloudinaryMediaService.resolve_field_url(getattr(obj, "image", None))

    @staticmethod
    def _assign_default_theme(branch):
        if BranchTheme.objects.filter(branch=branch).exists():
            return
        themes = [t for t in ensure_customer_themes() if t.show_in_tabs][:2]
        if themes:
            for theme in themes:
                BranchTheme.objects.get_or_create(branch=branch, theme=theme)
            return
        theme, _ = RoomTheme.objects.get_or_create(name="Featured", defaults={"slug": "featured", "sort_order": 10})
        BranchTheme.objects.get_or_create(branch=branch, theme=theme)

    @staticmethod
    def _assign_themes_from_payload(branch, payload):
        if not isinstance(payload, dict):
            BranchSerializer._assign_default_theme(branch)
            return
        raw = payload.get("theme_ids") or payload.get("themeIds") or payload.get("themes")
        theme_ids = raw if isinstance(raw, list) else []
        theme_ids = [str(item).strip() for item in theme_ids if str(item or "").strip()]
        if theme_ids:
            assign_branch_themes(branch, theme_ids)
            return
        BranchSerializer._assign_default_theme(branch)

    @staticmethod
    def _apply_geocode(branch, *, address: str | None = None):
        try:
            GeocodeService.apply_branch_coordinates(branch, address=address or branch.address)
        except Exception:
            pass

    def create(self, validated_data):
        request = self.context.get("request") if isinstance(self.context, dict) else None
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) not in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            raise serializers.ValidationError({"detail": "Not allowed to create branches."})
        payload = self.initial_data
        contact = payload.get("contact", {}) if isinstance(payload, dict) else {}
        billing = payload.get("billing", {}) if isinstance(payload, dict) else {}
        company_id = payload.get("business_id") or payload.get("businessId") or payload.get("company")
        if company_id:
            if user and Company.objects.filter(id=company_id, manager=user).exists() is False:
                raise serializers.ValidationError({"business_id": "Invalid business_id."})
            validated_data["company_id"] = company_id
        if contact:
            validated_data["phone"] = contact.get("phone", validated_data.get("phone", ""))
            validated_data["email"] = contact.get("email", validated_data.get("email", ""))
        elif isinstance(payload, dict):
            top_phone = str(payload.get("phone") or "").strip()
            if top_phone:
                validated_data["phone"] = top_phone
            top_email = str(payload.get("email") or "").strip()
            if top_email:
                validated_data["email"] = top_email
        if billing:
            validated_data["bank_name"] = billing.get("bank_name", billing.get("bankName", ""))
            validated_data["bank_account_number"] = billing.get(
                "account_number",
                billing.get("accountNumber", ""),
            )

        image_url = payload.get("image") if isinstance(payload, dict) else None
        if isinstance(image_url, str) and CloudinaryMediaService.is_http_url(image_url):
            public_id = CloudinaryMediaService.ingest_url(image_url, folder="nesto/branch_images")
            if public_id:
                validated_data["image"] = public_id
        images = payload.get("images") if isinstance(payload, dict) else None
        if isinstance(images, list):
            normalized = []
            for item in images:
                if isinstance(item, str) and CloudinaryMediaService.is_http_url(item):
                    uploaded = CloudinaryMediaService.upload_remote_url(item, folder="nesto/branch_gallery")
                    normalized.append(uploaded.get("secure_url") if uploaded else item)
                else:
                    normalized.append(item)
            validated_data["images"] = normalized
        instance = super().create(validated_data)
        self._apply_geocode(instance, address=instance.address)
        self._assign_themes_from_payload(instance, payload)
        return instance

    def update(self, instance, validated_data):
        payload = self.initial_data
        contact = payload.get("contact", {}) if isinstance(payload, dict) else None
        billing = payload.get("billing", {}) if isinstance(payload, dict) else None

        image_url = payload.get("image") if isinstance(payload, dict) else None
        if isinstance(image_url, str) and CloudinaryMediaService.is_http_url(image_url):
            public_id = CloudinaryMediaService.ingest_url(image_url, folder="nesto/branch_images")
            if public_id:
                validated_data["image"] = public_id
        images = payload.get("images") if isinstance(payload, dict) else None
        if isinstance(images, list):
            normalized = []
            for item in images:
                if isinstance(item, str) and CloudinaryMediaService.is_http_url(item):
                    uploaded = CloudinaryMediaService.upload_remote_url(item, folder="nesto/branch_gallery")
                    normalized.append(uploaded.get("secure_url") if uploaded else item)
                else:
                    normalized.append(item)
            validated_data["images"] = normalized
        old_address = str(instance.address or "")
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if isinstance(contact, dict):
            instance.phone = contact.get("phone", instance.phone)
            instance.email = contact.get("email", instance.email)
        if isinstance(billing, dict):
            instance.bank_name = billing.get("bank_name", billing.get("bankName", instance.bank_name))
            instance.bank_account_number = billing.get(
                "account_number",
                billing.get("accountNumber", instance.bank_account_number),
            )
        instance.save()
        if "address" in validated_data and str(validated_data.get("address") or "") != old_address:
            self._apply_geocode(instance, address=instance.address)
        if isinstance(payload, dict):
            raw = payload.get("theme_ids") or payload.get("themeIds") or payload.get("themes")
            if isinstance(raw, list) and raw:
                assign_branch_themes(instance, raw)
        return instance


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "code", "label", "created_at", "updated_at"]


class BranchCustomerSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = BranchCustomer
        fields = [
            "id",
            "branch",
            "branch_name",
            "user_id",
            "guest_name",
            "email",
            "phone",
            "booking_count",
            "total_spent",
            "last_booking_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
