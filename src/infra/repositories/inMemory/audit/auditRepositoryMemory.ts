import { AuditLog } from '@/domain/entities/AuditLog';
import IAuditRepository from '@/domain/repository/AuditRepository';

export default class AuditRepositoryMemory implements IAuditRepository {
  private entries: AuditLog[] = [];

  async record(entry: AuditLog): Promise<AuditLog> {
    this.entries.push(entry);
    return entry;
  }

  list(): AuditLog[] {
    return this.entries;
  }
}
