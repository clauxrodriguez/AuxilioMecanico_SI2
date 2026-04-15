from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


roles_permisos = Table(
    "api_roles_permisos",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("roles_id", String(36), ForeignKey("api_roles.id", ondelete="CASCADE"), nullable=False),
    Column("permisos_id", String(36), ForeignKey("api_permisos.id", ondelete="CASCADE"), nullable=False),
)


empleado_roles = Table(
    "api_empleado_roles",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("empleado_id", String(36), ForeignKey("api_empleado.id", ondelete="CASCADE"), nullable=False),
    Column("roles_id", String(36), ForeignKey("api_roles.id", ondelete="CASCADE"), nullable=False),
)


class User(Base):
    __tablename__ = "auth_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(150), default="")
    last_name: Mapped[str] = mapped_column(String(150), default="")
    email: Mapped[str] = mapped_column(String(254), default="")
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    date_joined: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    empleado: Mapped[Empleado | None] = relationship(back_populates="usuario", uselist=False)


class Empresa(Base):
    __tablename__ = "api_empresa"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    nit: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    direccion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    empleados: Mapped[list[Empleado]] = relationship(back_populates="empresa")
    roles: Mapped[list[Rol]] = relationship(back_populates="empresa")
    suscripcion: Mapped[Suscripcion | None] = relationship(back_populates="empresa", uselist=False)


class Cargo(Base):
    __tablename__ = "api_cargo"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    empresa_id: Mapped[str] = mapped_column(String(36), ForeignKey("api_empresa.id", ondelete="CASCADE"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)


class Departamento(Base):
    __tablename__ = "api_departamento"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    empresa_id: Mapped[str] = mapped_column(String(36), ForeignKey("api_empresa.id", ondelete="CASCADE"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)


class Permiso(Base):
    __tablename__ = "api_permisos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)


class Rol(Base):
    __tablename__ = "api_roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    empresa_id: Mapped[str] = mapped_column(String(36), ForeignKey("api_empresa.id", ondelete="CASCADE"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)

    empresa: Mapped[Empresa] = relationship(back_populates="roles")
    permisos: Mapped[list[Permiso]] = relationship(secondary=roles_permisos)


class Empleado(Base):
    __tablename__ = "api_empleado"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("auth_user.id", ondelete="CASCADE"), unique=True, nullable=False)
    empresa_id: Mapped[str] = mapped_column(String(36), ForeignKey("api_empresa.id", ondelete="CASCADE"), nullable=False)

    ci: Mapped[str] = mapped_column(String(20), nullable=False)
    apellido_p: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido_m: Mapped[str] = mapped_column(String(100), nullable=False)
    direccion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sueldo: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    cargo_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("api_cargo.id", ondelete="SET NULL"), nullable=True)
    departamento_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("api_departamento.id", ondelete="SET NULL"), nullable=True)

    foto_perfil: Mapped[str | None] = mapped_column(String(100), nullable=True)
    theme_preference: Mapped[str | None] = mapped_column(String(10), default="dark")
    theme_custom_color: Mapped[str | None] = mapped_column(String(7), default="#6366F1")
    theme_glow_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    fcm_token: Mapped[str | None] = mapped_column(String(255), nullable=True)

    usuario: Mapped[User] = relationship(back_populates="empleado")
    empresa: Mapped[Empresa] = relationship(back_populates="empleados")
    cargo: Mapped[Cargo | None] = relationship()
    departamento: Mapped[Departamento | None] = relationship()
    roles: Mapped[list[Rol]] = relationship(secondary=empleado_roles)


class Suscripcion(Base):
    __tablename__ = "api_suscripcion"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    empresa_id: Mapped[str] = mapped_column(String(36), ForeignKey("api_empresa.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="basico")
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="activa")
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    max_usuarios: Mapped[int] = mapped_column(Integer, default=5)
    max_activos: Mapped[int] = mapped_column(Integer, default=50)

    empresa: Mapped[Empresa] = relationship(back_populates="suscripcion")
