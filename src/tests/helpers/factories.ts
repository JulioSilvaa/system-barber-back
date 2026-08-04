export type UserProps = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  globalRole?: 'USER' | 'SUPER_ADMIN';
  isActive?: boolean;
};

export type UserBarbershopProps = {
  id: string;
  userId: string;
  barbershopId: string;
  status?: 'ACTIVE' | 'INACTIVE';
  localRole?: 'OWNER' | 'BARBER';
};

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

export type ServiceProps = {
  id: string;
  barbershopId: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  isActive?: boolean;
};

export type AppointmentProps = {
  id: string;
  barbershopId: string;
  barberId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  startDate: Date;
  endDate: Date;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
};

export function makeUserProps(overrides: Partial<UserProps> = {}): UserProps {
  return {
    id: 'user-1',
    name: 'João da Silva',
    email: 'joao@example.com',
    phone: '16999999999',
    password: 'Senha@123',
    globalRole: 'USER',
    isActive: true,
    ...overrides,
  };
}

export function makeBarbershopProps(overrides: Partial<BarbershopProps> = {}): BarbershopProps {
  return {
    id: 'barbershop-1',
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    phone: '+5516999999999',
    isActive: true,
    ...overrides,
  };
}

export function makeUserBarbershopProps(
  overrides: Partial<UserBarbershopProps> = {},
): UserBarbershopProps {
  return {
    id: 'membership-1',
    userId: 'user-1',
    barbershopId: 'barbershop-1',
    status: 'ACTIVE',
    localRole: 'BARBER',
    ...overrides,
  };
}

export function makeServiceProps(overrides: Partial<ServiceProps> = {}): ServiceProps {
  return {
    id: 'service-1',
    barbershopId: 'barbershop-1',
    name: 'Corte de cabelo',
    priceCents: 4000,
    durationMinutes: 30,
    isActive: true,
    ...overrides,
  };
}

export function makeAppointmentProps(overrides: Partial<AppointmentProps> = {}): AppointmentProps {
  return {
    id: 'appointment-1',
    barbershopId: 'barbershop-1',
    barberId: 'user-2',
    serviceId: 'service-1',
    customerName: 'Maria Souza',
    customerPhone: '16988888888',
    startDate: new Date('2026-08-05T14:00:00.000Z'),
    endDate: new Date('2026-08-05T14:30:00.000Z'),
    status: 'SCHEDULED',
    ...overrides,
  };
}
