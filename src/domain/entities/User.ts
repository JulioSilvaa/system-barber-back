import { ValidationError } from '@/domain/errors';
export type UserProps = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive?: boolean;
};

export default class User {
  public _id: string;
  public _name: string;
  public _email: string;
  public _phone?: string;
  public _isActive: boolean;

  constructor(props: UserProps) {
    this._id = props.id;
    this._name = props.name;
    this._email = props.email;
    this._phone = props.phone;
    this._isActive = props.isActive ?? true;
    this.validate();
  }

  static create(props: UserProps): User {
    return new User(props);
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

  get phone(): string | undefined {
    return this._phone;
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

  set phone(value: string | undefined) {
    this._phone = value;
    this.validatePhone();
  }

  public activate(): void {
    this._isActive = true;
  }

  public deactivate(): void {
    this._isActive = false;
  }

  // ================= VALIDAÇÕES =================

  private validate(): void {
    this.validateName();
    this.validateEmail();
    this.validatePhone();
  }

  private validateName(): void {
    if (!this._name || this._name.trim() === '') {
      throw new ValidationError('Nome é obrigatório');
    }

    const trimmed = this._name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new ValidationError('Nome deve ter entre 2 e 80 caracteres');
    }

    const nameRegex = /^[A-Za-zÀ-ÿ\s'-]+$/;
    if (!nameRegex.test(trimmed)) {
      throw new ValidationError('Nome contém caracteres inválidos');
    }
  }

  private validateEmail(): void {
    if (!this._email || this._email.trim() === '') {
      throw new ValidationError('Email é obrigatório');
    }

    const trimmedEmail = this._email.trim().toLowerCase();

    if (trimmedEmail.length > 254) {
      throw new ValidationError('Email é muito longo');
    }

    const emailRegex = /^(?=.{1,254}$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new ValidationError('Formato de email inválido');
    }
  }

  private validatePhone(): void {
    if (!this._phone || this._phone.trim() === '') {
      return;
    }

    const digits = this._phone.replace(/\D/g, '');

    if (digits.length < 10 || digits.length > 11) {
      throw new ValidationError('Telefone deve ter 10 ou 11 dígitos');
    }

    if (/^(\d)\1+$/.test(digits)) {
      throw new ValidationError('Telefone não pode ser uma sequência repetida de dígitos');
    }

    const ddd = parseInt(digits.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) {
      throw new ValidationError('DDD do telefone é inválido');
    }

    if (digits.length === 11 && digits[2] !== '9') {
      throw new ValidationError('Celulares devem começar com 9 após o DDD');
    }
  }
}
