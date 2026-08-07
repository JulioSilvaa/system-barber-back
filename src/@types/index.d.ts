declare namespace Express {
  export interface Request {
    user_id?: string;
    userId?: string;
    actor?: 'USER' | 'BARBERSHOP' | 'ADMIN';
    barbershopId?: string;
    localRole?: string;
    membershipActive?: boolean;
  }
}
