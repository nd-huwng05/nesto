from django.apps import AppConfig
from django.db.models.signals import post_migrate


def create_default_groups(sender, **kwargs):
    from django.contrib.auth.models import Group
    default_groups = ['Admin', 'Business', 'Housekeeping', 'Reception', 'Service', 'Restaurant', 'Spa', 'Driver']
    for group_name in default_groups:
        Group.objects.get_or_create(name=group_name)


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        post_migrate.connect(create_default_groups, sender=self)
