from rest_framework import serializers

from businesses.models import Branch, Company, Department
from core.services.serializer_mixins import CloudinaryRepresentationMixin
from core.services.cloudinary_service import CloudinaryMediaService


class CompanySerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
    legalName = serializers.CharField(source="legal_name", required=False, allow_blank=True)
    taxCode = serializers.CharField(source="tax_code", required=False, allow_blank=True)
    businessType = serializers.CharField(source="business_type", required=False, allow_blank=True)
    legalRepresentative = serializers.CharField(source="legal_representative", required=False, allow_blank=True)
    lodgingType = serializers.CharField(source="lodging_type", required=False, allow_blank=True)
    contact = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()

    cloudinary_field_map = {"logo": "logo"}

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "logo",
            "lodgingType",
            "businessType",
            "scale",
            "legalName",
            "taxCode",
            "legalRepresentative",
            "contact",
            "created_at",
            "updated_at",
        ]

    def get_contact(self, obj):
        return {
            "email": obj.contact_email,
            "phone": obj.contact_phone,
            "headquartersAddress": obj.headquarters_address,
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
            headquarters_address=contact.get("headquartersAddress", ""),
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
                "headquartersAddress", instance.headquarters_address
            )
        instance.save()
        return instance


class BranchSerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
    businessId = serializers.UUIDField(source="company_id", read_only=True)
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.none(), required=False, allow_null=True)
    lodgingType = serializers.CharField(source="lodging_type", required=False, allow_blank=True)
    guestSegments = serializers.ListField(source="guest_segments", child=serializers.CharField(), required=False)
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
            "businessId",
            "company",
            "name",
            "lodgingType",
            "address",
            "phone",
            "email",
            "contact",
            "amenities",
            "guestSegments",
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
        return {"bankName": obj.bank_name, "accountNumber": obj.bank_account_number}

    def get_image(self, obj):
        return CloudinaryMediaService.resolve_field_url(getattr(obj, "image", None))

    def create(self, validated_data):
        request = self.context.get("request") if isinstance(self.context, dict) else None
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) not in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            raise serializers.ValidationError({"detail": "Not allowed to create branches."})
        payload = self.initial_data
        contact = payload.get("contact", {}) if isinstance(payload, dict) else {}
        billing = payload.get("billing", {}) if isinstance(payload, dict) else {}
        company_id = payload.get("businessId") or payload.get("company")
        if company_id:
            if user and Company.objects.filter(id=company_id, manager=user).exists() is False:
                raise serializers.ValidationError({"businessId": "Invalid businessId."})
            validated_data["company_id"] = company_id
        if contact:
            validated_data["phone"] = contact.get("phone", validated_data.get("phone", ""))
            validated_data["email"] = contact.get("email", validated_data.get("email", ""))
        if billing:
            validated_data["bank_name"] = billing.get("bankName", "")
            validated_data["bank_account_number"] = billing.get("accountNumber", "")

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
        return super().create(validated_data)

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
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if isinstance(contact, dict):
            instance.phone = contact.get("phone", instance.phone)
            instance.email = contact.get("email", instance.email)
        if isinstance(billing, dict):
            instance.bank_name = billing.get("bankName", instance.bank_name)
            instance.bank_account_number = billing.get("accountNumber", instance.bank_account_number)
        instance.save()
        return instance


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "code", "label", "created_at", "updated_at"]
