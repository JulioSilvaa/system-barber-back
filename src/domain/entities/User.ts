export type GlobalUserRole = 'USER' | 'SUPER_ADMIN';

export type UserProps = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  globalRole?: GlobalUserRole;
  isActive?: boolean;
};

export default class User {
  public _id: string;
  public _name: string;
  public _email: string;
  public _phone: string;
  public _password?: string;
  public _globalRole: GlobalUserRole;
  public _isActive: boolean;

  constructor(props: UserProps) {
    this._id = props.id;
    this._name = props.name;
    this._email = props.email;
    this._phone = props.phone;
    this._password = props?.password;
    this._globalRole = props.globalRole ?? 'USER';
    this._isActive = props.isActive ?? true;
    this.validate();
  }

  static create(props: UserProps): User {
    return new User({ ...props, globalRole: props.globalRole ?? 'USER' });
  }

  // ================= GETTERS =================
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  get phone(): string {
    return this._phone;
  }

  get password(): string | undefined {
    return this._password;
  }

  get globalRole(): GlobalUserRole {
    return this._globalRole;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // ================= SETTERS / MUTADORES DE ESTADO =================
  set name(value: string) {
    this._name = value;
    this.validateName();
  }

  set email(value: string) {
    this._email = value;
    this.validateEmail();
  }

  set phone(value: string) {
    this._phone = value;
    this.validatePhone();
  }

  set password(value: string | undefined) {
    this._password = value;
    this.validatePassword();
  }

  set globalRole(value: GlobalUserRole) {
    this._globalRole = value;
    this.validateGlobalRole();
  }

  public activate(): void {
    this._isActive = true;
  }

  public deactivate(): void {
    this._isActive = false;
  }

  // ================= MÉTODOS DE CONVENIÊNCIA =================
  public isSuperAdmin(): boolean {
    return this._globalRole === 'SUPER_ADMIN';
  }

  public isRegularUser(): boolean {
    return this._globalRole === 'USER';
  }

  // ================= VALIDAÇÕES =================

  private validate(): void {
    this.validateName();
    this.validateEmail();
    this.validatePhone();
    this.validatePassword();
    this.validateGlobalRole();
  }

  private validateName(): void {
    if (!this._name || this._name.trim() === '') {
      throw new Error('Nome é obrigatório');
    }

    const trimmed = this._name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new Error('Nome deve ter entre 2 e 80 caracteres');
    }

    const nameRegex = /^[A-Za-zÀ-ÿ\s'-]+$/;
    if (!nameRegex.test(trimmed)) {
      throw new Error('Nome contém caracteres inválidos');
    }
  }

  private validateEmail(): void {
    if (!this._email || this._email.trim() === '') {
      throw new Error('Email é obrigatório');
    }

    const trimmedEmail = this._email.trim().toLowerCase();

    if (trimmedEmail.length > 254) {
      throw new Error('Email é muito longo');
    }

    const emailRegex = /^(?=.{1,254}$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Formato de email inválido');
    }
  }

  private validatePhone(): void {
    if (!this._phone || this._phone.trim() === '') {
      throw new Error('Telefone é obrigatório');
    }

    const digits = this._phone.replace(/\D/g, '');

    if (digits.length < 10 || digits.length > 11) {
      throw new Error('Telefone deve ter 10 ou 11 dígitos');
    }

    if (/^(\d)\1+$/.test(digits)) {
      throw new Error('Telefone não pode ser uma sequência repetida de dígitos');
    }

    const ddd = parseInt(digits.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) {
      throw new Error('DDD do telefone é inválido');
    }

    if (digits.length === 11 && digits[2] !== '9') {
      throw new Error('Celulares devem começar com 9 após o DDD');
    }
  }

  private validatePassword(): void {
    if (!this._password) {
      throw new Error('Senha é obrigatória');
    }

    if (this._password.length < 8 || this._password.length > 72) {
      throw new Error('Senha deve ter entre 8 e 72 caracteres');
    }

    const hasUpperCase = /[A-Z]/.test(this._password);
    const hasLowerCase = /[a-z]/.test(this._password);
    const hasNumber = /[0-9]/.test(this._password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new Error(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    }
  }

  private validateGlobalRole(): void {
    const validRoles: GlobalUserRole[] = ['USER', 'SUPER_ADMIN'];
    if (!this._globalRole || !validRoles.includes(this._globalRole)) {
      throw new Error('Papel global inválido');
    }
  }
}
