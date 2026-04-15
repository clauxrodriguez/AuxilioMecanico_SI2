"""Initial schema for backendnew

Revision ID: 20260415_01
Revises:
Create Date: 2026-04-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260415_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auth_user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("password", sa.String(length=128), nullable=False),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("username", sa.String(length=150), nullable=False),
        sa.Column("first_name", sa.String(length=150), nullable=False, server_default=""),
        sa.Column("last_name", sa.String(length=150), nullable=False, server_default=""),
        sa.Column("email", sa.String(length=254), nullable=False, server_default=""),
        sa.Column("is_staff", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("date_joined", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "api_empresa",
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
        "api_permisos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )

    op.create_table(
        "api_cargo",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["api_empresa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "api_departamento",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["api_empresa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "api_roles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(["empresa_id"], ["api_empresa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "api_empleado",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("ci", sa.String(length=20), nullable=False),
        sa.Column("apellido_p", sa.String(length=100), nullable=False),
        sa.Column("apellido_m", sa.String(length=100), nullable=False),
        sa.Column("direccion", sa.String(length=255), nullable=True),
        sa.Column("telefono", sa.String(length=20), nullable=True),
        sa.Column("sueldo", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0"),
        sa.Column("cargo_id", sa.String(length=36), nullable=True),
        sa.Column("departamento_id", sa.String(length=36), nullable=True),
        sa.Column("foto_perfil", sa.String(length=100), nullable=True),
        sa.Column("theme_preference", sa.String(length=10), nullable=True, server_default="dark"),
        sa.Column("theme_custom_color", sa.String(length=7), nullable=True, server_default="#6366F1"),
        sa.Column("theme_glow_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("fcm_token", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["cargo_id"], ["api_cargo.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["departamento_id"], ["api_departamento.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["empresa_id"], ["api_empresa.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["usuario_id"], ["auth_user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id"),
    )

    op.create_table(
        "api_suscripcion",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=36), nullable=False),
        sa.Column("plan", sa.String(length=20), nullable=False, server_default="basico"),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="activa"),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.Column("max_usuarios", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("max_activos", sa.Integer(), nullable=False, server_default="50"),
        sa.ForeignKeyConstraint(["empresa_id"], ["api_empresa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("empresa_id"),
    )

    op.create_table(
        "api_roles_permisos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("roles_id", sa.String(length=36), nullable=False),
        sa.Column("permisos_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["permisos_id"], ["api_permisos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["roles_id"], ["api_roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "api_empleado_roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("empleado_id", sa.String(length=36), nullable=False),
        sa.Column("roles_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["empleado_id"], ["api_empleado.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["roles_id"], ["api_roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("api_empleado_roles")
    op.drop_table("api_roles_permisos")
    op.drop_table("api_suscripcion")
    op.drop_table("api_empleado")
    op.drop_table("api_roles")
    op.drop_table("api_departamento")
    op.drop_table("api_cargo")
    op.drop_table("api_permisos")
    op.drop_table("api_empresa")
    op.drop_table("auth_user")
