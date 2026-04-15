from pydantic import BaseModel, EmailStr, Field


class RegisterEmpresaRequest(BaseModel):
    empresa_nombre: str = Field(max_length=100)
    empresa_nit: str = Field(max_length=20)

    admin_username: str = Field(max_length=100)
    admin_password: str
    admin_first_name: str = Field(max_length=100)
    admin_email: EmailStr
    admin_ci: str = Field(max_length=20)
    admin_apellido_p: str = Field(max_length=100)
    admin_apellido_m: str = Field(max_length=100)

    card_number: str
    card_expiry: str
    card_cvc: str
    plan: str
