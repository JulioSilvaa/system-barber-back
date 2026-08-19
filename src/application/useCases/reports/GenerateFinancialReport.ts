import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';

export interface FinancialReportData {
  title: string;
  period: string;
  revenue: { total: number; appointments: number };
  expenses: { total: number; entries: number };
  balance: number;
  rows: (string | number)[][];
}

export default class GenerateFinancialReportUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly financeEntryRepository: IFinanceEntryRepository,
  ) {}

  async execute(
    barbershopId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FinancialReportData> {
    const now = new Date();
    const from = startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = endDate ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const appointments = await this.appointmentRepository.findAllByBarbershop(barbershopId);
    const entries = await this.financeEntryRepository.findByBarbershop(barbershopId);

    const completedAppointments = appointments.filter(
      a => a.status === 'COMPLETED' && a.startDate >= from && a.startDate <= to,
    );

    const filteredEntries = entries.filter(e => e.createdAt >= from && e.createdAt <= to);

    const totalRevenue = completedAppointments.reduce((sum, a) => sum + (a.pricePaidCents ?? 0), 0);
    const totalExpenses = filteredEntries
      .filter((e: { kind: string }) => e.kind === 'EXIT')
      .reduce((sum: number, e: { amountCents: number }) => sum + e.amountCents, 0);

    const rows: (string | number)[][] = [];
    for (const appointment of completedAppointments) {
      rows.push([
        appointment.startDate.toLocaleDateString('pt-BR'),
        'Receita - Agendamento',
        `R$ ${((appointment.pricePaidCents ?? 0) / 100).toFixed(2)}`,
        appointment.paymentMethod ?? '-',
      ]);
    }

    for (const entry of filteredEntries) {
      rows.push([
        entry.createdAt.toLocaleDateString('pt-BR'),
        entry.kind === 'EXIT' ? 'Despesa' : 'Receita',
        `${entry.kind === 'EXIT' ? '-' : ''}R$ ${(entry.amountCents / 100).toFixed(2)}`,
        entry.category ?? '-',
      ]);
    }

    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    const periodStr = `${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}`;

    return {
      title: 'Relatório Financeiro',
      period: periodStr,
      revenue: { total: totalRevenue, appointments: completedAppointments.length },
      expenses: { total: totalExpenses, entries: filteredEntries.length },
      balance: totalRevenue - totalExpenses,
      rows,
    };
  }
}
