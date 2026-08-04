declare namespace Express {
  export interface Request {
    user_id?: string;
    userId?: string;
    globalRole?: 'USER' | 'SUPER_ADMIN';
    barbershopId?: string;
    localRole?: string;
    membershipActive?: boolean;
  }
}
