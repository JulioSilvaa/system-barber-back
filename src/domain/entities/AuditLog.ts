export type ActorType = 'USER' | 'BARBERSHOP' | 'ADMIN' | 'PUBLIC' | 'SYSTEM';

export type AuditLogProps = {
  id: string;
  actorId?: string;
  actorType: ActorType;
  actorRole?: string;
  barbershopId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt?: Date;
};

export class AuditLog {
  public readonly id: string;
  public readonly actorId?: string;
  public readonly actorType: ActorType;
  public readonly actorRole?: string;
  public readonly barbershopId?: string;
  public readonly action: string;
  public readonly entityType: string;
  public readonly entityId: string;
  public readonly before?: Record<string, unknown>;
  public readonly after?: Record<string, unknown>;
  public readonly createdAt: Date;

  constructor(props: AuditLogProps) {
    if (!props.id) {
      throw new Error('id do registro de auditoria é obrigatório');
    }
    if (!props.action || props.action.trim() === '') {
      throw new Error('ação é obrigatória');
    }
    if (!props.entityType || props.entityType.trim() === '') {
      throw new Error('tipo da entidade é obrigatório');
    }
    if (!props.entityId || props.entityId.trim() === '') {
      throw new Error('id da entidade é obrigatório');
    }

    this.id = props.id;
    this.actorId = props.actorId;
    this.actorType = props.actorType;
    this.actorRole = props.actorRole;
    this.barbershopId = props.barbershopId;
    this.action = props.action;
    this.entityType = props.entityType;
    this.entityId = props.entityId;
    this.before = props.before;
    this.after = props.after;
    this.createdAt = props.createdAt ?? new Date();
  }
}
