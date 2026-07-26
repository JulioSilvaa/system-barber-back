export type UserRole = 'ADMIN' | 'BARBER';

export type UserProps = {
  id: string;
  barbershopId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive?: boolean;
};

export class User {
  public readonly id: string;
  public readonly barbershopId: string;
  public readonly name: string;
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly role: UserRole;
  public readonly isActive: boolean;

  constructor(props: UserProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.isActive = props.isActive ?? true;
  }

  public isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  public isBarber(): boolean {
    return this.role === 'BARBER';
  }
}
