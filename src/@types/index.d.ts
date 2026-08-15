declare namespace Express {
  export interface Request {
    userId?: string;
    actor?: 'USER' | 'BARBERSHOP' | 'ADMIN';
    barbershopId?: string;
    localRole?: string;
    membershipActive?: boolean;
  }
}
