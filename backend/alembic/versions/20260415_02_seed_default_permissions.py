"""Seed default permissions for user management

Revision ID: 20260415_02
Revises: 20260415_01
Create Date: 2026-04-15
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260415_02"
down_revision: Union[str, None] = "20260415_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    permission_table = sa.table(
        "api_permisos",
        sa.column("id", sa.String(length=36)),
        sa.column("nombre", sa.String(length=100)),
        sa.column("descripcion", sa.Text()),
    )

    default_permissions = [
        ("manage_empleado", "Gestionar empleados (crear, editar y eliminar)."),
        ("manage_rol", "Gestionar roles (crear, editar y eliminar)."),
        ("manage_permiso", "Gestionar permisos del sistema."),
        ("view_empleado", "Ver empleados."),
        ("view_rol", "Ver roles."),
        ("view_permiso", "Ver permisos."),
    ]

    conn = op.get_bind()
    for name, description in default_permissions:
        exists = conn.execute(
            sa.text("SELECT 1 FROM api_permisos WHERE nombre = :nombre"),
            {"nombre": name},
        ).first()
        if exists:
            continue

        op.bulk_insert(
            permission_table,
            [
                {
                    "id": str(uuid.uuid4()),
                    "nombre": name,
                    "descripcion": description,
                }
            ],
        )

    role_permission_rows = conn.execute(
        sa.text(
            """
            SELECT r.id AS role_id, p.id AS permiso_id
            FROM api_roles r
            JOIN api_permisos p ON p.nombre IN (
                'manage_empleado',
                'manage_rol',
                'manage_permiso',
                'view_empleado',
                'view_rol',
                'view_permiso'
            )
            WHERE LOWER(r.nombre) = 'admin'
            """
        )
    ).all()

    for row in role_permission_rows:
        exists = conn.execute(
            sa.text(
                """
                SELECT 1
                FROM api_roles_permisos
                WHERE roles_id = :role_id AND permisos_id = :permiso_id
                """
            ),
            {"role_id": row.role_id, "permiso_id": row.permiso_id},
        ).first()
        if exists:
            continue

        conn.execute(
            sa.text(
                """
                INSERT INTO api_roles_permisos (roles_id, permisos_id)
                VALUES (:role_id, :permiso_id)
                """
            ),
            {"role_id": row.role_id, "permiso_id": row.permiso_id},
        )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM api_permisos
            WHERE nombre IN (
                'manage_empleado',
                'manage_rol',
                'manage_permiso',
                'view_empleado',
                'view_rol',
                'view_permiso'
            )
            """
        )
    )
