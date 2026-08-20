export type UserProps = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  isActive?: boolean;
};

export type UserBarbershopProps = {
  id: string;
  userId: string;
  barbershopId: string;
  status?: 'ACTIVE' | 'INACTIVE';
  localRole?: 'BARBER';
};

export type BarbershopProps = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  password: string;
  primaryColor?: string;
  logoUrl?: string;
  isActive?: boolean;
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
  customerId: string;
  startDate: Date;
  endDate: Date;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  pricePaidCents?: number | null;
  paymentMethod?: 'PIX' | 'CASH' | 'DEBIT' | 'CREDIT' | null;
};

export type CustomerProps = {
  id: string;
  barbershopId: string;
  name: string;
  phone: string;
  email?: string;
  isActive?: boolean;
};

export function makeUserProps(overrides: Partial<UserProps> = {}): UserProps {
  return {
    id: 'user-1',
    name: 'João da Silva',
    email: 'joao@example.com',
    phone: '16999999999',
    isActive: true,
    ...overrides,
  };
}

export function makeBarbershopProps(overrides: Partial<BarbershopProps> = {}): BarbershopProps {
  return {
    id: 'barbershop-1',
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    email: 'contato@barbeariacentral.com',
    phone: '+5516999999999',
    password: 'Senha@123',
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

export function futureDate(daysFromNow = 1, hours = 14, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function makeAppointmentProps(overrides: Partial<AppointmentProps> = {}): AppointmentProps {
  const start = futureDate(1, 14);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    id: 'appointment-1',
    barbershopId: 'barbershop-1',
    barberId: 'user-2',
    serviceId: 'service-1',
    customerId: 'customer-1',
    startDate: start,
    endDate: end,
    status: 'SCHEDULED',
    ...overrides,
  };
}

export function makeCustomerProps(overrides: Partial<CustomerProps> = {}): CustomerProps {
  return {
    id: 'customer-1',
    barbershopId: 'barbershop-1',
    name: 'Maria Souza',
    phone: '16988888888',
    isActive: true,
    ...overrides,
  };
}
