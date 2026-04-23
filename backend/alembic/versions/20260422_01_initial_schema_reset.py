"""Initial schema reset

Revision ID: 20260422_01
Revises:
Create Date: 2026-04-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260422_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auth_user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("password", sa.String(length=128), nullable=False),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("username", sa.String(length=150), nullable=False),
        sa.Column("first_name", sa.String(length=150), nullable=False),
        sa.Column("last_name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("is_staff", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("date_joined", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "empresa",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("nit", sa.String(length=20), nullable=False),
        sa.Column("direccion", sa.String(length=255), nullable=True),
        sa.Column("telefono", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=True),
        sa.Column("fecha_creacion", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
        sa.UniqueConstraint("nit"),
    )

    op.create_table(
        "permisos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )

    op.create_table(
        "cargo",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "roles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "servicio",
        sa.Column("id_servicio", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id_servicio"),
    )

    op.create_table(
        "empleado",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("ci", sa.String(length=20), nullable=False),
        sa.Column("nombre_completo", sa.String(length=201), nullable=False),
        sa.Column("direccion", sa.String(length=255), nullable=True),
        sa.Column("telefono", sa.String(length=20), nullable=True),
        sa.Column("sueldo", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("cargo_id", sa.String(length=36), nullable=True),
        sa.Column("foto_perfil", sa.String(length=100), nullable=True),
        sa.Column("fcm_token", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["cargo_id"], ["cargo.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresa.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["usuario_id"], ["auth_user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id"),
    )

    op.create_table(
        "suscripcion",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("plan", sa.String(length=20), nullable=False),
        sa.Column("estado", sa.String(length=20), nullable=False),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.Column("max_usuarios", sa.Integer(), nullable=False),
        sa.Column("max_activos", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("empresa_id"),
    )

    op.create_table(
        "roles_permisos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("roles_id", sa.String(length=36), nullable=False),
        sa.Column("permisos_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["permisos_id"], ["permisos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["roles_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "empleado_roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("empleado_id", sa.String(length=36), nullable=False),
        sa.Column("roles_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["empleado_id"], ["empleado.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["roles_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("empleado_roles")
    op.drop_table("roles_permisos")
    op.drop_table("suscripcion")
    op.drop_table("empleado")
    op.drop_table("servicio")
    op.drop_table("roles")
    op.drop_table("cargo")
    op.drop_table("permisos")
    op.drop_table("empresa")
    op.drop_table("auth_user")
