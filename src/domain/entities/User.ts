export type UserRole = 'ADMIN' | 'BARBER';

export type UserProps = {
  id: string;
  barbershopId: string;
  name: string;
  phone: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
  email: string;
};

export default class User {
  public _id: string;
  public _barbershopId: string;
  public _name: string;
  public _phone: string;
  public _role: UserRole;
  public _isActive: boolean;
  public _password?: string;
  public _email: string;

  constructor(props: UserProps) {
    this._id = props.id;
    this._barbershopId = props.barbershopId;
    this._name = props.name;
    this._phone = props.phone;
    this._role = props.role ?? 'BARBER';
    this._password = props?.password;
    this._isActive = props.isActive ?? true;
    this._email = props.email;
    this.validate();
  }

  static create(props: UserProps): User {
    return new User({ ...props, role: props.role ?? 'BARBER' });
  }

  // ================= GETTERS =================
  get id(): string {
    return this._id;
  }

  get barbershopId(): string {
    return this._barbershopId;
  }

  get name(): string {
    return this._name;
  }

  get phone(): string {
    return this._phone;
  }

  get role(): UserRole {
    return this._role;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get password(): string | undefined {
    return this._password;
  }

  get email(): string {
    return this._email;
  }

  // ================= SETTERS / MUTADORES DE ESTADO =================
  set name(value: string) {
    this._name = value;
    this.validateName();
  }

  set phone(value: string) {
    this._phone = value;
    this.validatePhone();
  }

  set role(value: UserRole) {
    this._role = value;
    this.validateRole();
  }

  set password(value: string | undefined) {
    this._password = value;
    this.validatePassword();
  }

  set email(value: string) {
    this._email = value;
    this.validateEmail();
  }

  public activate(): void {
    this._isActive = true;
  }

  public deactivate(): void {
    this._isActive = false;
  }

  // ================= MÉTODOS DE CONVENIÊNCIA =================
  public isAdmin(): boolean {
    return this._role === 'ADMIN';
  }

  public isBarber(): boolean {
    return this._role === 'BARBER';
  }

  // ================= VALIDAÇÕES =================

  private validate(): void {
    this.validateName();
    this.validateEmail();
    this.validateBarbershopId();
    this.validateRole();
    this.validatePassword();
    this.validatePhone();
  }

  private validateName(): void {
    if (!this._name || this._name.trim() === '') {
      throw new Error('Nome é obrigatório');
    }

    const trimmed = this._name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new Error('Nome deve ter entre 2 e 80 caracteres');
    }

    // Corrigido: Aceita letras simples, acentuadas, espaços, ' e -
    const nameRegex = /^[A-Za-zÀ-ÿ\s'-]+$/;
    if (!nameRegex.test(trimmed)) {
      throw new Error('Nome contém caracteres inválidos');
    }
  }

  private validateEmail(): void {
    if (!this._email || this._email.trim() === '') {
      throw new Error('Email is required');
    }

    const trimmedEmail = this._email.trim().toLowerCase();

    if (trimmedEmail.length > 254) {
      throw new Error('Email is too long');
    }

    // Regex conforme padrão RFC 5322 simplificado e prático
    const emailRegex = /^(?=.{1,254}$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format');
    }
  }

  private validateBarbershopId(): void {
    if (!this._barbershopId || this._barbershopId.trim() === '') {
      throw new Error('Barbershop ID is required');
    }

    // Se for UUIDv4 (comum em IDs de banco)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this._barbershopId.trim())) {
      throw new Error('Invalid Barbershop ID format');
    }
  }

  private validateRole(): void {
    const validRoles = ['ADMIN', 'BARBER'];
    if (!this._role || !validRoles.includes(this._role)) {
      throw new Error('Invalid role');
    }
  }

  private validatePhone(): void {
    if (!this._phone || this._phone.trim() === '') {
      throw new Error('Phone is required');
    }

    const digits = this._phone.replace(/\D/g, '');

    // Valida tamanho padrão do Brasil (10 dígitos para fixo, 11 para celular com nono dígito)
    if (digits.length < 10 || digits.length > 11) {
      throw new Error('Phone must have 10 or 11 digits');
    }

    // Impede números repetidos como '11111111111'
    if (/^(\d)\1+$/.test(digits)) {
      throw new Error('Phone cannot be a repeated sequence of digits');
    }

    // Valida DDDs válidos do Brasil (11 a 99) e Nono Dígito para celulares
    const ddd = parseInt(digits.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) {
      throw new Error('Invalid DDD in phone number');
    }

    if (digits.length === 11 && digits[2] !== '9') {
      throw new Error('Mobile phones must start with 9 after DDD');
    }
  }

  private validatePassword(): void {
    if (!this._password) {
      throw new Error('Password is required');
    }

    if (this._password.length < 8 || this._password.length > 72) {
      throw new Error('Password must be between 8 and 72 characters');
    }

    // Regra de complexidade: pelo menos 1 letra maiúscula, 1 minúscula e 1 número
    const hasUpperCase = /[A-Z]/.test(this._password);
    const hasLowerCase = /[a-z]/.test(this._password);
    const hasNumber = /[0-9]/.test(this._password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new Error(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      );
    }
  }
}
