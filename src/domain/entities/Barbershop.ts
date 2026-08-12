export type BarbershopProps = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  primaryColor?: string;
  logoUrl?: string;
  isActive?: boolean;
  password: string;
};

export class Barbershop {
  public readonly id: string;
  public readonly name: string;
  public readonly slug: string;
  public readonly email: string;
  public readonly phone: string;
  public readonly primaryColor?: string;
  public readonly logoUrl?: string;
  public readonly isActive: boolean;
  public readonly password: string;

  constructor(props: BarbershopProps) {
    this.validateSlug(props.slug);
    this.validateEmail(props.email);
    this.validatePhone(props.phone);
    this.validatePassword(props.password);

    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.email = props.email.trim().toLowerCase();
    this.phone = props.phone;
    this.primaryColor = props.primaryColor;
    this.logoUrl = props.logoUrl;
    this.isActive = props.isActive ?? true;
    this.password = props.password;
  }

  private validateSlug(slug: string): void {
    const isValid = /^[a-z0-9-]+$/i.test(slug) && !slug.includes(' ');

    if (!isValid || slug !== slug.toLowerCase()) {
      throw new Error('slug must contain only lowercase letters, numbers, and hyphens');
    }
  }

  private validateEmail(email: string): void {
    const emailRegex = /^(?=.{1,254}$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email || !emailRegex.test(email)) {
      throw new Error('email must be a valid email address');
    }
  }

  private validatePhone(phone: string): void {
    const isValid = /^\+?[1-9]\d{8,14}$/.test(phone);

    if (!isValid) {
      throw new Error('phone must be a valid international phone number');
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error(
        'password must be at least 8 characters long and contain at least one letter and one number',
      );
    }

    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      throw new Error(
        'password must be at least 8 characters long and contain at least one letter and one number',
      );
    }
  }
}
