"""Helpers for idempotent migrations on databases created outside Django history."""

from django.db import models


def table_exists(schema_editor, table_name: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        tables = set(schema_editor.connection.introspection.table_names(cursor))
    return table_name in tables


def existing_columns(schema_editor, table_name: str) -> set[str]:
    with schema_editor.connection.cursor() as cursor:
        return {
            col.name
            for col in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }


def add_model_fields_if_missing(schema_editor, model, fields):
    table = model._meta.db_table
    present = existing_columns(schema_editor, table)
    for field in fields:
        if field.name in present:
            continue
        field.set_attributes_from_name(field.name)
        schema_editor.add_field(model, field)


def create_model_if_missing(apps, schema_editor, app_label, model_name):
    model = apps.get_model(app_label, model_name)
    if table_exists(schema_editor, model._meta.db_table):
        return False
    schema_editor.create_model(model)
    return True


def index_exists(schema_editor, table_name: str, index_name: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        constraints = schema_editor.connection.introspection.get_constraints(cursor, table_name)
    return index_name in constraints


def constraint_exists(schema_editor, table_name: str, constraint_name: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        constraints = schema_editor.connection.introspection.get_constraints(cursor, table_name)
    entry = constraints.get(constraint_name)
    if entry is None:
        return False
    return bool(entry.get("unique") or entry.get("index") or entry.get("primary_key"))


def add_db_index_if_missing(schema_editor, table_name: str, index_name: str, column_names: list[str]) -> bool:
    """Create index via SQL — does not require fields on the historical migration model."""
    if index_exists(schema_editor, table_name, index_name):
        return False
    present = existing_columns(schema_editor, table_name)
    if not all(column in present for column in column_names):
        return False

    quoted_table = schema_editor.quote_name(table_name)
    quoted_index = schema_editor.quote_name(index_name)
    quoted_columns = ", ".join(schema_editor.quote_name(column) for column in column_names)
    schema_editor.execute(f"CREATE INDEX {quoted_index} ON {quoted_table} ({quoted_columns})")
    return True


def add_index_if_missing(schema_editor, model, index):
    """Prefer add_db_index_if_missing during RunPython before model state is updated."""
    column_names = []
    for field_name in index.fields:
        try:
            field = model._meta.get_field(field_name)
            column_names.append(field.column)
        except Exception:
            column_names.append(f"{field_name}_id" if field_name != "id" else "id")
    return add_db_index_if_missing(schema_editor, model._meta.db_table, index.name, column_names)


def drop_index_if_exists(schema_editor, table_name: str, index_name: str) -> bool:
    if not index_exists(schema_editor, table_name, index_name):
        return False
    quoted_index = schema_editor.quote_name(index_name)
    if schema_editor.connection.vendor == "sqlite":
        schema_editor.execute(f"DROP INDEX {quoted_index}")
    else:
        quoted_table = schema_editor.quote_name(table_name)
        schema_editor.execute(f"DROP INDEX {quoted_index} ON {quoted_table}")
    return True


def rename_index_if_exists(schema_editor, table_name: str, old_name: str, new_name: str) -> bool:
    if old_name == new_name:
        return False
    # Fresh SQLite databases use Django-generated index names; renames target legacy MySQL DBs.
    if schema_editor.connection.vendor == "sqlite":
        return False
    if not index_exists(schema_editor, table_name, old_name):
        return False
    if index_exists(schema_editor, table_name, new_name):
        return False

    quoted_old = schema_editor.quote_name(old_name)
    quoted_new = schema_editor.quote_name(new_name)
    vendor = schema_editor.connection.vendor

    if vendor == "mysql":
        quoted_table = schema_editor.quote_name(table_name)
        schema_editor.execute(f"ALTER TABLE {quoted_table} RENAME INDEX {quoted_old} TO {quoted_new}")
    else:
        schema_editor.execute(f"ALTER INDEX {quoted_old} RENAME TO {quoted_new}")
    return True


def _foreign_key_constraints_on_column(schema_editor, table_name: str, column_name: str) -> list[str]:
    with schema_editor.connection.cursor() as cursor:
        constraints = schema_editor.connection.introspection.get_constraints(cursor, table_name)
    names = []
    for constraint_name, details in constraints.items():
        if not details.get("foreign_key"):
            continue
        if column_name in (details.get("columns") or []):
            names.append(constraint_name)
    return names


def drop_foreign_key_column_if_present(schema_editor, table_name: str, column_name: str) -> bool:
    present = existing_columns(schema_editor, table_name)
    if column_name not in present:
        return False

    quoted_table = schema_editor.quote_name(table_name)
    for constraint_name in _foreign_key_constraints_on_column(schema_editor, table_name, column_name):
        quoted_constraint = schema_editor.quote_name(constraint_name)
        schema_editor.execute(f"ALTER TABLE {quoted_table} DROP FOREIGN KEY {quoted_constraint}")

    return remove_column_if_present(schema_editor, table_name, column_name)


def remove_column_if_present(schema_editor, table_name: str, column_name: str) -> bool:
    present = existing_columns(schema_editor, table_name)
    if column_name not in present:
        return False
    quoted_table = schema_editor.quote_name(table_name)
    quoted_column = schema_editor.quote_name(column_name)
    schema_editor.execute(f"ALTER TABLE {quoted_table} DROP COLUMN {quoted_column}")
    return True


def remove_field_if_present(schema_editor, model, field_name: str) -> bool:
    return remove_column_if_present(schema_editor, model._meta.db_table, field_name)


def column_has_index(schema_editor, table_name: str, column_name: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        constraints = schema_editor.connection.introspection.get_constraints(cursor, table_name)
    for details in constraints.values():
        if not details.get("index"):
            continue
        if column_name in (details.get("columns") or []):
            return True
    return False


def add_column_index_if_missing(
    schema_editor,
    table_name: str,
    column_name: str,
    index_name: str | None = None,
) -> bool:
    if not table_exists(schema_editor, table_name):
        return False
    if column_has_index(schema_editor, table_name, column_name):
        return False
    resolved_name = index_name or f"{table_name}_{column_name}_idx"
    return add_db_index_if_missing(schema_editor, table_name, resolved_name, [column_name])


def add_unique_constraint_if_missing(schema_editor, table_name: str, constraint_name: str, column_names: list[str]) -> bool:
    if constraint_exists(schema_editor, table_name, constraint_name):
        return False
    present = existing_columns(schema_editor, table_name)
    if not all(column in present for column in column_names):
        return False

    quoted_table = schema_editor.quote_name(table_name)
    quoted_constraint = schema_editor.quote_name(constraint_name)
    quoted_columns = ", ".join(schema_editor.quote_name(column) for column in column_names)

    if schema_editor.connection.vendor == "sqlite":
        schema_editor.execute(
            f"CREATE UNIQUE INDEX {quoted_constraint} ON {quoted_table} ({quoted_columns})"
        )
    else:
        schema_editor.execute(
            f"ALTER TABLE {quoted_table} ADD CONSTRAINT {quoted_constraint} UNIQUE ({quoted_columns})"
        )
    return True
