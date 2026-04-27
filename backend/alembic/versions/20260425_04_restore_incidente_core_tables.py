"""Restore missing incidente core tables

Revision ID: 20260425_04
Revises: 20260425_03
Create Date: 2026-04-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260425_04"
down_revision: Union[str, None] = "20260425_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ESTADO_TAREA_ENUM_PG = postgresql.ENUM(
    "asignada",
    "aceptada",
    "en_proceso",
    "completada",
    "cancelada",
    "rechazada",
    name="estado_tarea_enum",
    create_type=False,
)


def _ensure_estado_tarea_enum() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_tarea_enum') THEN
                    CREATE TYPE estado_tarea_enum AS ENUM (
                        'asignada',
                        'aceptada',
                        'en_proceso',
                        'completada',
                        'cancelada',
                        'rechazada'
                    );
                END IF;
            END
            $$;
            """
        )


def _ensure_incidente_tables() -> None:
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
            sa.Column("estado", sa.String(length=50), nullable=False, server_default="pendiente"),
            sa.Column("prioridad", sa.Integer(), nullable=True),
            sa.Column("latitud", sa.Numeric(precision=9, scale=6), nullable=True),
            sa.Column("longitud", sa.Numeric(precision=9, scale=6), nullable=True),
            sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
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
            sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["incidente_id"], ["incidente.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        tables.add("diagnostico")


def _ensure_asignacion_servicio_table() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    required_tables = {"incidente", "empleado", "servicio", "empresa"}
    if not required_tables.issubset(tables):
        return

    if "asignacion_servicio" not in tables:
        op.create_table(
            "asignacion_servicio",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("incidente_id", sa.String(length=36), nullable=False),
            sa.Column("empleado_id", sa.String(length=36), nullable=False),
            sa.Column("servicio_id", sa.String(length=36), nullable=False),
            sa.Column("empresa_id", sa.String(length=36), nullable=False),
            sa.Column("estado_tarea", ESTADO_TAREA_ENUM_PG, nullable=False, server_default="asignada"),
            sa.Column("tiempo_estimado_llegada_minutos", sa.Integer(), nullable=True),
            sa.Column("costo_servicio", sa.Numeric(12, 2), nullable=True),
            sa.Column("porcentaje_comision", sa.Numeric(5, 2), nullable=True),
            sa.Column("monto_comision", sa.Numeric(12, 2), nullable=True),
            sa.Column("fecha_asignacion", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("fecha_cierre", sa.DateTime(timezone=True), nullable=True),
            sa.Column("motivo_cancelacion", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["incidente_id"], ["incidente.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["empleado_id"], ["empleado.id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["servicio_id"], ["servicio.id_servicio"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["empresa_id"], ["empresa.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.CheckConstraint("costo_servicio IS NULL OR costo_servicio >= 0", name="ck_asig_costo_nonnegative"),
            sa.CheckConstraint(
                "porcentaje_comision IS NULL OR (porcentaje_comision >= 0 AND porcentaje_comision <= 100)",
                name="ck_asig_porcentaje_rango",
            ),
            sa.CheckConstraint(
                "monto_comision IS NULL OR monto_comision >= 0",
                name="ck_asig_monto_nonnegative",
            ),
            sa.CheckConstraint(
                "costo_servicio IS NULL OR monto_comision IS NULL OR monto_comision <= costo_servicio",
                name="ck_asig_monto_le_costo",
            ),
            sa.CheckConstraint(
                "tiempo_estimado_llegada_minutos IS NULL OR tiempo_estimado_llegada_minutos >= 0",
                name="ck_asig_eta_nonnegative",
            ),
        )


def _ensure_asignacion_indexes() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "asignacion_servicio" not in tables:
        return

    current_indexes = {idx["name"] for idx in inspector.get_indexes("asignacion_servicio")}

    if "ix_asignacion_incidente_estado" not in current_indexes:
        op.create_index(
            "ix_asignacion_incidente_estado",
            "asignacion_servicio",
            ["incidente_id", "estado_tarea"],
            unique=False,
        )

    if "ix_asignacion_empleado_estado" not in current_indexes:
        op.create_index(
            "ix_asignacion_empleado_estado",
            "asignacion_servicio",
            ["empleado_id", "estado_tarea"],
            unique=False,
        )

    if "ix_asignacion_empresa_fecha" not in current_indexes:
        op.create_index(
            "ix_asignacion_empresa_fecha",
            "asignacion_servicio",
            ["empresa_id", "fecha_asignacion"],
            unique=False,
        )

    if "uq_asignacion_incidente_activa" not in current_indexes:
        op.create_index(
            "uq_asignacion_incidente_activa",
            "asignacion_servicio",
            ["incidente_id"],
            unique=True,
            postgresql_where=sa.text("estado_tarea IN ('asignada', 'aceptada', 'en_proceso')"),
        )

    if "uq_asignacion_empleado_activa" not in current_indexes:
        op.create_index(
            "uq_asignacion_empleado_activa",
            "asignacion_servicio",
            ["empleado_id"],
            unique=True,
            postgresql_where=sa.text("estado_tarea IN ('asignada', 'aceptada', 'en_proceso')"),
        )


def upgrade() -> None:
    _ensure_estado_tarea_enum()
    _ensure_incidente_tables()
    _ensure_asignacion_servicio_table()
    _ensure_asignacion_indexes()


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tables = set(inspector.get_table_names())
    if "asignacion_servicio" in tables:
        current_indexes = {idx["name"] for idx in inspector.get_indexes("asignacion_servicio")}
        for index_name in (
            "ix_asignacion_incidente_estado",
            "ix_asignacion_empleado_estado",
            "ix_asignacion_empresa_fecha",
            "uq_asignacion_incidente_activa",
            "uq_asignacion_empleado_activa",
        ):
            if index_name in current_indexes:
                op.drop_index(index_name, table_name="asignacion_servicio")
        op.drop_table("asignacion_servicio")

    if "diagnostico" in tables:
        op.drop_table("diagnostico")

    if "evidencia" in tables:
        op.drop_table("evidencia")

    if "incidente" in tables:
        op.drop_table("incidente")

    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS estado_tarea_enum")
