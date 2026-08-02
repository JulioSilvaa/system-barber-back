import IdGeneratorRepository from "@/domain/repository/IdGeneratorRepository";
import crypto from "crypto";

export class CryptoUuidGenerator implements IdGeneratorRepository {
  generate(): string {
    return crypto.randomUUID();
  }
}