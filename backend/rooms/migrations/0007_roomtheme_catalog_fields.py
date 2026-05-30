from django.db import migrations, models

from core.migration_utils import add_db_index_if_missing, add_model_fields_if_missing, existing_columns
from rooms.services.customer_theme_service import CUSTOMER_THEME_SPECS


def _theme_model_fields(RoomTheme) -> set[str]:
    return {field.name for field in RoomTheme._meta.fields}


def seed_catalog_themes(apps, schema_editor):
    """Runs in state_operations after AddField — historical model includes catalog fields."""
    import uuid as uuid_lib

    RoomTheme = apps.get_model("rooms", "RoomTheme")
    field_names = _theme_model_fields(RoomTheme)

    for spec in CUSTOMER_THEME_SPECS:
        defaults = {"id": uuid_lib.uuid4()}
        if "slug" in field_names:
            defaults["slug"] = spec.get("slug", "")
        if "icon" in field_names:
            defaults["icon"] = spec.get("icon", "")
        if "description" in field_names:
            defaults["description"] = spec.get("description", "")
        if "sort_order" in field_names:
            defaults["sort_order"] = int(spec.get("sort_order") or 0)
        if "is_active" in field_names:
            defaults["is_active"] = True
        if "show_in_tabs" in field_names:
            defaults["show_in_tabs"] = True

        theme, created = RoomTheme.objects.get_or_create(name=spec["name"], defaults=defaults)
        if not created:
            if "slug" in field_names:
                theme.slug = spec.get("slug", getattr(theme, "slug", ""))
            if "icon" in field_names:
                theme.icon = spec.get("icon", getattr(theme, "icon", ""))
            if "description" in field_names:
                theme.description = spec.get("description", getattr(theme, "description", ""))
            if "sort_order" in field_names:
                theme.sort_order = int(spec.get("sort_order") or getattr(theme, "sort_order", 0) or 0)
            if "is_active" in field_names:
                theme.is_active = True
            if "show_in_tabs" in field_names:
                theme.show_in_tabs = True
            theme.save()


def sync_roomtheme_catalog_schema(apps, schema_editor):
    """Idempotent column/index sync for brownfield MySQL databases."""
    RoomTheme = apps.get_model("rooms", "RoomTheme")
    table = RoomTheme._meta.db_table

    add_model_fields_if_missing(
        schema_editor,
        RoomTheme,
        [
            models.SlugField(blank=True, max_length=64, null=True, name="slug"),
            models.CharField(blank=True, default="", max_length=255, name="description"),
            models.PositiveIntegerField(default=0, name="sort_order"),
            models.BooleanField(default=True, name="is_active"),
            models.BooleanField(
                default=True,
                name="show_in_tabs",
                help_text="When true, theme appears in customer home tabs and business branch picker.",
            ),
        ],
    )

    present = existing_columns(schema_editor, table)
    if "slug" in present:
        old_slug = models.SlugField(blank=True, max_length=64, null=True, name="slug")
        new_slug = models.SlugField(blank=True, default="", max_length=64, unique=True, name="slug")
        old_slug.set_attributes_from_name("slug")
        new_slug.set_attributes_from_name("slug")
        schema_editor.alter_field(RoomTheme, old_slug, new_slug)

    add_db_index_if_missing(
        schema_editor,
        table,
        "room_themes_active_sort_idx",
        ["is_active", "sort_order"],
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("rooms", "0006_roomcategory_tier_pricing"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(sync_roomtheme_catalog_schema, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="roomtheme",
                    name="slug",
                    field=models.SlugField(blank=True, max_length=64, null=True),
                ),
                migrations.AddField(
                    model_name="roomtheme",
                    name="description",
                    field=models.CharField(blank=True, default="", max_length=255),
                ),
                migrations.AddField(
                    model_name="roomtheme",
                    name="sort_order",
                    field=models.PositiveIntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="roomtheme",
                    name="is_active",
                    field=models.BooleanField(default=True),
                ),
                migrations.AddField(
                    model_name="roomtheme",
                    name="show_in_tabs",
                    field=models.BooleanField(
                        default=True,
                        help_text="When true, theme appears in customer home tabs and business branch picker.",
                    ),
                ),
                migrations.RunPython(seed_catalog_themes, noop_reverse),
                migrations.AlterField(
                    model_name="roomtheme",
                    name="slug",
                    field=models.SlugField(blank=True, default="", max_length=64, unique=True),
                ),
                migrations.AddIndex(
                    model_name="roomtheme",
                    index=models.Index(fields=["is_active", "sort_order"], name="room_themes_active_sort_idx"),
                ),
            ],
        ),
    ]
