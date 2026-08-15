import { ValidationError } from '@/domain/errors';
export type AdminProps = {
  id: string;
  name: string;
  email: string;
  password: string;
  isActive?: boolean;
};

export class Admin {
  public readonly id: string;
  public readonly name: string;
  public readonly email: string;
  public readonly password: string;
  public readonly isActive: boolean;

  constructor(props: AdminProps) {
    this.validateName(props.name);
    this.validateEmail(props.email);
    this.validatePassword(props.password);

    this.id = props.id;
    this.name = props.name.trim();
    this.email = props.email.trim().toLowerCase();
    this.password = props.password;
    this.isActive = props.isActive ?? true;
  }

  static create(props: AdminProps): Admin {
    return new Admin(props);
  }

  static validatePassword(password: string): void {
    if (!password || password.trim() === '') {
      throw new ValidationError('Senha é obrigatória');
    }

    if (password.length < 8 || password.length > 72) {
      throw new ValidationError('Senha deve ter entre 8 e 72 caracteres');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new ValidationError(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    }
  }

  public activate(): Admin {
    return new Admin({ ...this, isActive: true });
  }

  public deactivate(): Admin {
    return new Admin({ ...this, isActive: false });
  }

  private validateName(name: string): void {
    if (!name || name.trim() === '') {
      throw new ValidationError('Nome é obrigatório');
    }

    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new ValidationError('Nome deve ter entre 2 e 80 caracteres');
    }
  }

  private validateEmail(email: string): void {
    if (!email || email.trim() === '') {
      throw new ValidationError('Email é obrigatório');
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail.length > 254) {
      throw new ValidationError('Email é muito longo');
    }

    const emailRegex = /^(?=.{1,254}$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new ValidationError('Formato de email inválido');
    }
  }

  private validatePassword(password: string): void {
    Admin.validatePassword(password);
  }
}
