export type BarbershopProps = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  primaryColor?: string;
  logoUrl?: string;
  isActive?: boolean;
  password?: string;
};

export class Barbershop {
  public readonly id: string;
  public readonly name: string;
  public readonly slug: string;
  public readonly phone: string;
  public readonly isActive: boolean;
  public readonly password: string | undefined;

  constructor(props: BarbershopProps) {
    this.validateSlug(props.slug);
    this.validatePhone(props.phone);
    this.validatePassword(props.password);

    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.phone = props.phone;
    this.isActive = props.isActive ?? true;
    this.password = props.password;
  }

  private validateSlug(slug: string): void {
    const isValid = /^[a-z0-9-]+$/i.test(slug) && !slug.includes(' ');

    if (!isValid || slug !== slug.toLowerCase()) {
      throw new Error('slug must contain only lowercase letters, numbers, and hyphens');
    }
  }

  private validatePhone(phone: string): void {
    const isValid = /^\+?[1-9]\d{8,14}$/.test(phone);

    if (!isValid) {
      throw new Error('phone must be a valid international phone number');
    }
  }

  private validatePassword(password?: string): void {
    if (!password) {
      return;
    }

    const isValid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);

    if (!isValid) {
      throw new Error(
        'password must be at least 8 characters long and contain at least one letter and one number',
      );
    }
  }
}
