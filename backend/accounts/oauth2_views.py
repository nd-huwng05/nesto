import json

from oauth2_provider.models import AccessToken
from oauth2_provider.views import TokenView as OAuth2TokenView


class CustomTokenView(OAuth2TokenView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        try:
            payload = json.loads(getattr(response, "content", b"{}").decode("utf-8") or "{}")
            access_token = payload.get("access_token")
            if access_token:
                access_obj = AccessToken.objects.select_related("user").get(token=access_token)
                user = access_obj.user
                # Ensure role→groups are synchronized for routing/RBAC.
                try:
                    user.save()
                except Exception:
                    pass
                payload["role"] = getattr(user, "role", None)
                payload["is_staff"] = bool(getattr(user, "is_staff", False))
                payload["is_superuser"] = bool(getattr(user, "is_superuser", False))
                payload["user"] = {
                    "id": str(getattr(user, "id", "")),
                    "email": getattr(user, "email", ""),
                    "name": getattr(user, "name", ""),
                    "phone": getattr(user, "phone", ""),
                    "role": getattr(user, "role", None),
                    "groups": [g.name for g in user.groups.all()],
                    "is_staff": bool(getattr(user, "is_staff", False)),
                    "is_superuser": bool(getattr(user, "is_superuser", False)),
                    "branchId": str(getattr(getattr(user, "staff_profile", None), "branch_id", "") or ""),
                    "department": str(getattr(getattr(user, "staff_profile", None), "department", "") or ""),
                    "jobRole": str(getattr(getattr(user, "staff_profile", None), "job_role", "") or ""),
                }
                response.content = json.dumps(payload).encode("utf-8")
        except Exception:
            return response

        return response

