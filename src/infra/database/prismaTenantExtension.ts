const TENANT_MODELS = new Set([
  'barbershop',
  'service',
  'appointment',
  'customer',
  'workingHours',
  'userBarbershop',
  'commission',
  'evaluation',
  'financeEntry',
  'subscription',
  'featureFlag',
  'aiSettings',
  'pushSubscription',
]);

type TenantContext = { barbershopId?: string };

export function tenantExtension(ctx: TenantContext) {
  return {
    name: 'tenantIsolation' as const,
    query: {
      $allModels: {
        async $allOperations({ args, operation, model, query }: any) {
          if (!ctx.barbershopId) {
            return query(args);
          }

          if (!TENANT_MODELS.has(model)) {
            return query(args);
          }

          const where = args?.where as Record<string, unknown> | undefined;

          if (where && where.barbershopId) {
            return query(args);
          }

          if (
            operation === 'findFirst' ||
            operation === 'findMany' ||
            operation === 'count' ||
            operation === 'aggregate' ||
            operation === 'groupBy'
          ) {
            args.where = { ...args.where, barbershopId: ctx.barbershopId };
          }

          if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
            if (!where || !where.barbershopId) {
              args.where = { ...args.where, barbershopId: ctx.barbershopId };
            }
          }

          if (operation === 'upsert') {
            if (!where || !where.barbershopId) {
              args.where = { ...args.where, barbershopId: ctx.barbershopId };
            }
          }

          return query(args);
        },
      },
    },
  };
}
