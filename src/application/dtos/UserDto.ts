export interface CreateUserInputDTO {
  name: string;
  email: string;
  phone?: string;
}

export interface CreateUserOutputDTO {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
}
