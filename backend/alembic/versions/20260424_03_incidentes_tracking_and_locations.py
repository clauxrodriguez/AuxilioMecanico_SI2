"""Add incident assignment and geolocation fields

Revision ID: 20260424_03
Revises: 20260424_02
Create Date: 2026-04-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260424_03"
down_revision: Union[str, None] = "20260424_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "incidente" not in tables:
        op.create_table(
            "incidente",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("cliente_id", sa.String(length=36), nullable=True),
            sa.Column("vehiculo_id", sa.String(length=36), nullable=True),
            sa.Column("tipo", sa.String(length=100), nullable=True),
            sa.Column("descripcion", sa.Text(), nullable=True),
            sa.Column("estado", sa.String(length=50), nullable=False),
            sa.Column("prioridad", sa.Integer(), nullable=True),
            sa.Column("latitud", sa.Numeric(precision=9, scale=6), nullable=True),
            sa.Column("longitud", sa.Numeric(precision=9, scale=6), nullable=True),
            sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["cliente_id"], ["cliente.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["vehiculo_id"], ["vehiculo.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        tables.add("incidente")

    if "evidencia" not in tables:
        op.create_table(
            "evidencia",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("incidente_id", sa.String(length=36), nullable=False),
            sa.Column("tipo", sa.String(length=50), nullable=False),
            sa.Column("url_archivo", sa.String(length=255), nullable=True),
            sa.Column("texto", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["incidente_id"], ["incidente.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        tables.add("evidencia")

    if "diagnostico" not in tables:
        op.create_table(
            "diagnostico",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("incidente_id", sa.String(length=36), nullable=False),
            sa.Column("clasificacion", sa.Integer(), nullable=True),
            sa.Column("resumen", sa.Text(), nullable=True),
            sa.Column("prioridad", sa.Integer(), nullable=True),
            sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["incidente_id"], ["incidente.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        tables.add("diagnostico")

    if "empresa" in tables:
        empresa_columns = {column["name"] for column in inspector.get_columns("empresa")}
        if "latitud" not in empresa_columns:
            op.add_column("empresa", sa.Column("latitud", sa.Numeric(precision=9, scale=6), nullable=True))
        if "longitud" not in empresa_columns:
            op.add_column("empresa", sa.Column("longitud", sa.Numeric(precision=9, scale=6), nullable=True))

    if "empleado" in tables:
        empleado_columns = {column["name"] for column in inspector.get_columns("empleado")}
        if "latitud_actual" not in empleado_columns:
            op.add_column("empleado", sa.Column("latitud_actual", sa.Numeric(precision=9, scale=6), nullable=True))
        if "longitud_actual" not in empleado_columns:
            op.add_column("empleado", sa.Column("longitud_actual", sa.Numeric(precision=9, scale=6), nullable=True))
        if "ubicacion_actualizada_en" not in empleado_columns:
            op.add_column("empleado", sa.Column("ubicacion_actualizada_en", sa.DateTime(timezone=True), nullable=True))
        if "disponible" not in empleado_columns:
            op.add_column("empleado", sa.Column("disponible", sa.Boolean(), nullable=False, server_default=sa.true()))
            op.alter_column("empleado", "disponible", server_default=None)

    if "incidente" in tables and "empleado" in tables:
        incidente_columns = {column["name"] for column in inspector.get_columns("incidente")}
        if "empleado_asignado_id" not in incidente_columns:
            op.add_column("incidente", sa.Column("empleado_asignado_id", sa.String(length=36), nullable=True))

        incident_fks = {fk["name"] for fk in inspector.get_foreign_keys("incidente")}
        if "fk_incidente_empleado_asignado" not in incident_fks:
            op.create_foreign_key(
                "fk_incidente_empleado_asignado",
                "incidente",
                "empleado",
                ["empleado_asignado_id"],
                ["id"],
                ondelete="SET NULL",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "incidente" in tables:
        incident_fks = {fk["name"] for fk in inspector.get_foreign_keys("incidente")}
        if "fk_incidente_empleado_asignado" in incident_fks:
            op.drop_constraint("fk_incidente_empleado_asignado", "incidente", type_="foreignkey")

        incidente_columns = {column["name"] for column in inspector.get_columns("incidente")}
        if "empleado_asignado_id" in incidente_columns:
            op.drop_column("incidente", "empleado_asignado_id")

    if "empleado" in tables:
        empleado_columns = {column["name"] for column in inspector.get_columns("empleado")}
        if "disponible" in empleado_columns:
            op.drop_column("empleado", "disponible")
        if "ubicacion_actualizada_en" in empleado_columns:
            op.drop_column("empleado", "ubicacion_actualizada_en")
        if "longitud_actual" in empleado_columns:
            op.drop_column("empleado", "longitud_actual")
        if "latitud_actual" in empleado_columns:
            op.drop_column("empleado", "latitud_actual")

    if "empresa" in tables:
        empresa_columns = {column["name"] for column in inspector.get_columns("empresa")}
        if "longitud" in empresa_columns:
            op.drop_column("empresa", "longitud")
        if "latitud" in empresa_columns:
            op.drop_column("empresa", "latitud")
