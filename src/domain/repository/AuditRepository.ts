import { AuditLog } from '@/domain/entities/AuditLog';

export default interface IAuditRepository {
  record(entry: AuditLog): Promise<AuditLog>;
}
