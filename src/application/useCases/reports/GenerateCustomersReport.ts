import ICustomerRepository from '@/domain/repository/CustomerRepository';

export interface CustomerReportData {
  title: string;
  total: number;
  vip: number;
  rows: (string | number)[][];
}

export default class GenerateCustomersReportUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(barbershopId: string): Promise<CustomerReportData> {
    const customers = await this.customerRepository.findByBarbershop(barbershopId);

    const total = customers.length;
    const vip = customers.filter(c => c.vip).length;

    const rows: (string | number)[][] = [];
    for (const customer of customers) {
      rows.push([
        customer.name,
        customer.phone,
        customer.email ?? '-',
        customer.vip ? 'VIP' : 'Regular',
      ]);
    }

    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    return {
      title: 'Relatório de Clientes',
      total,
      vip,
      rows,
    };
  }
}
