/// Modelo de usuario/empleado
class User {
  final int id;
  final String username;
  final String email;
  final String? firstName;
  final String? lastName;
  final String role; // 'admin' o 'empleado'
  final String? empresaId;
  final bool isActive;
  final DateTime? createdAt;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.firstName,
    this.lastName,
    required this.role,
    this.empresaId,
    required this.isActive,
    this.createdAt,
  });

  /// Crea un User desde JSON del backend
  factory User.fromJson(Map<String, dynamic> json) {
    // Determinar el rol basado en la estructura del backend
    String role = 'empleado'; // por defecto
    
    if (json['es_admin'] == true || json['is_admin'] == true) {
      role = 'admin';
    }

    final rawId = json['id'];
    final parsedId = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0;

    final rawEmpresaId = json['empresa_id'];
    final parsedEmpresaId = rawEmpresaId == null ? null : rawEmpresaId.toString();

    final rawCreatedAt = json['created_at'];
    DateTime? parsedCreatedAt;
    if (rawCreatedAt != null && rawCreatedAt.toString().isNotEmpty) {
      parsedCreatedAt = DateTime.tryParse(rawCreatedAt.toString());
    }
    
    return User(
      id: parsedId,
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      firstName: json['first_name'],
      lastName: json['last_name'],
      role: role,
      empresaId: parsedEmpresaId,
      isActive: json['is_active'] ?? false,
      createdAt: parsedCreatedAt,
    );
  }

  /// Convierte a JSON para enviar al backend
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'es_admin': role == 'admin',
      'empresa_id': empresaId,
      'is_active': isActive,
    };
  }

  /// Nombre completo del usuario
  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return firstName ?? lastName ?? username;
  }

  @override
  String toString() => 'User(id: $id, username: $username, role: $role)';
}
