import ICommissionRepository from '@/domain/repository/CommissionRepository';
import IUserRepository from '@/domain/repository/UserRepository';

export interface CommissionReportData {
  title: string;
  period: string;
  totalCents: number;
  rows: (string | number)[][];
}

export default class GenerateCommissionsReportUseCase {
  constructor(
    private readonly commissionRepository: ICommissionRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    barbershopId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CommissionReportData> {
    const now = new Date();
    const from = startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = endDate ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const commissions = await this.commissionRepository.findByBarbershop(barbershopId);

    const filtered = commissions.filter(c => c.createdAt >= from && c.createdAt <= to);

    const barberIds = [...new Set(filtered.map(c => c.barberId))];
    const users = barberIds.length > 0 ? await this.userRepository.findByIds(barberIds) : [];
    const nameById = new Map(users.map(u => [u.id, u.name]));

    const totalCents = filtered.reduce((sum, c) => sum + c.commissionCents, 0);

    const rows: (string | number)[][] = [];
    for (const commission of filtered) {
      rows.push([
        commission.createdAt.toLocaleDateString('pt-BR'),
        nameById.get(commission.barberId) ?? 'Barbeiro',
        commission.isPaid ? 'Pago' : 'Pendente',
        `R$ ${(commission.commissionCents / 100).toFixed(2)}`,
      ]);
    }

    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    const periodStr = `${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}`;

    return {
      title: 'Relatório de Comissões',
      period: periodStr,
      totalCents,
      rows,
    };
  }
}
