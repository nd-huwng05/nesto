from django.apps import AppConfig
from django.db.models.signals import post_migrate


def create_default_groups(sender, **kwargs):
    from django.contrib.auth.models import Group

    default_groups = [
        "Admin_Group",
        "Customer_Group",
        "Business_Group",
        "Receptionist_Group",
        "Housekeeping_Group",
        "Service_Group",
        "Staff_Group",
    ]
    for group_name in default_groups:
        Group.objects.get_or_create(name=group_name)


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        post_migrate.connect(create_default_groups, sender=self)
