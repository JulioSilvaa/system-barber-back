import { User } from "@/domain/entities";
import IUserRepository from "@/domain/repository/UserRepository";

export default class UserRepositoryMemory implements IUserRepository {
  save(user: User): Promise<void> {
    console.log("User saved in memory:", user);
    return Promise.resolve();
  }
  findByEmail(email: string): Promise<User | null> {
    throw new Error("Method not implemented.");
  }
  findById(id: string): Promise<User | null> {
    throw new Error("Method not implemented.");
  }
}