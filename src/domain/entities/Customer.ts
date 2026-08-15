import { ValidationError } from '@/domain/errors';
export type CustomerProps = {
  id: string;
  barbershopId: string;
  name: string;
  phone: string;
  email?: string;
  isActive?: boolean;
  vip?: boolean;
};

export class Customer {
  public readonly id: string;
  public readonly barbershopId: string;
  public readonly name: string;
  public readonly phone: string;
  public readonly email?: string;
  public readonly isActive: boolean;
  public readonly vip: boolean;

  constructor(props: CustomerProps) {
    this.validateName(props.name);
    this.validatePhone(props.phone);
    this.validateEmail(props.email);

    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name.trim();
    this.phone = props.phone.trim();
    this.email = props.email ? props.email.trim().toLowerCase() : undefined;
    this.isActive = props.isActive ?? true;
    this.vip = props.vip ?? false;
  }

  private validateName(name: string): void {
    if (!name || name.trim() === '') {
      throw new ValidationError('Nome do cliente é obrigatório');
    }

    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new ValidationError('Nome do cliente deve ter entre 2 e 80 caracteres');
    }
  }

  private validatePhone(phone: string): void {
    if (!phone || phone.trim() === '') {
      throw new ValidationError('Telefone do cliente é obrigatório');
    }

    const digits = phone.replace(/\D/g, '');

    if (digits.length < 10 || digits.length > 11) {
      throw new ValidationError('Telefone do cliente deve ter 10 ou 11 dígitos');
    }

    if (/^(\d)\1+$/.test(digits)) {
      throw new ValidationError(
        'Telefone do cliente não pode ser uma sequência repetida de dígitos',
      );
    }

    const ddd = parseInt(digits.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) {
      throw new ValidationError('DDD do telefone do cliente é inválido');
    }

    if (digits.length === 11 && digits[2] !== '9') {
      throw new ValidationError('Celulares devem começar com 9 após o DDD');
    }
  }

  private validateEmail(email?: string): void {
    if (!email) {
      return;
    }

    const emailRegex = /^(?=.{1,254}$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      throw new ValidationError('Email do cliente inválido');
    }
  }
}
