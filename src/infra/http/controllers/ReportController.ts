import { NextFunction, Request, Response } from 'express';
import GenerateFinancialReportUseCase from '@/application/useCases/reports/GenerateFinancialReport';
import GenerateCommissionsReportUseCase from '@/application/useCases/reports/GenerateCommissionsReport';
import GenerateCustomersReportUseCase from '@/application/useCases/reports/GenerateCustomersReport';
import PdfReportService from '@/infra/services/PdfReportService';
import ExcelReportService from '@/infra/services/ExcelReportService';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';

export default class ReportController {
  private readonly financialReport: GenerateFinancialReportUseCase;
  private readonly commissionsReport: GenerateCommissionsReportUseCase;
  private readonly customersReport: GenerateCustomersReportUseCase;
  private readonly pdfService: PdfReportService;
  private readonly excelService: ExcelReportService;

  constructor(
    appointmentRepository: IAppointmentRepository,
    financeEntryRepository: IFinanceEntryRepository,
    commissionRepository: ICommissionRepository,
    userRepository: IUserRepository,
    customerRepository: ICustomerRepository,
  ) {
    this.financialReport = new GenerateFinancialReportUseCase(
      appointmentRepository,
      financeEntryRepository,
    );
    this.commissionsReport = new GenerateCommissionsReportUseCase(
      commissionRepository,
      userRepository,
    );
    this.customersReport = new GenerateCustomersReportUseCase(customerRepository);
    this.pdfService = new PdfReportService();
    this.excelService = new ExcelReportService();
  }

  financialPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const data = await this.financialReport.execute(barbershopId);

      const pdf = await this.pdfService.generate({
        title: data.title,
        subtitle: `Período: ${data.period}`,
        headers: ['Data', 'Tipo', 'Valor', 'Categoria'],
        rows: data.rows,
        footer: `Saldo: R$ ${(data.balance / 100).toFixed(2)}`,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-financeiro.pdf');
      return res.send(pdf);
    } catch (error) {
      next(error);
    }
  };

  financialExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const data = await this.financialReport.execute(barbershopId);

      const excel = await this.excelService.generate({
        title: data.title,
        sheetName: 'Financeiro',
        headers: ['Data', 'Tipo', 'Valor', 'Categoria'],
        rows: data.rows,
        columnWidths: [15, 25, 15, 20],
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-financeiro.xlsx');
      return res.send(excel);
    } catch (error) {
      next(error);
    }
  };

  commissionsPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const data = await this.commissionsReport.execute(barbershopId);

      const pdf = await this.pdfService.generate({
        title: data.title,
        subtitle: `Período: ${data.period}`,
        headers: ['Data', 'Barbeiro', 'Status', 'Valor'],
        rows: data.rows,
        footer: `Total: R$ ${(data.totalCents / 100).toFixed(2)}`,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-comissoes.pdf');
      return res.send(pdf);
    } catch (error) {
      next(error);
    }
  };

  commissionsExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const data = await this.commissionsReport.execute(barbershopId);

      const excel = await this.excelService.generate({
        title: data.title,
        sheetName: 'Comissões',
        headers: ['Data', 'Barbeiro', 'Status', 'Valor'],
        rows: data.rows,
        columnWidths: [15, 25, 15, 15],
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-comissoes.xlsx');
      return res.send(excel);
    } catch (error) {
      next(error);
    }
  };

  customersPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const data = await this.customersReport.execute(barbershopId);

      const pdf = await this.pdfService.generate({
        title: data.title,
        subtitle: `Total: ${data.total} clientes (${data.vip} VIP)`,
        headers: ['Nome', 'Telefone', 'Email', 'Tipo', 'Cadastro'],
        rows: data.rows,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-clientes.pdf');
      return res.send(pdf);
    } catch (error) {
      next(error);
    }
  };

  customersExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const data = await this.customersReport.execute(barbershopId);

      const excel = await this.excelService.generate({
        title: data.title,
        sheetName: 'Clientes',
        headers: ['Nome', 'Telefone', 'Email', 'Tipo', 'Cadastro'],
        rows: data.rows,
        columnWidths: [25, 18, 30, 12, 15],
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-clientes.xlsx');
      return res.send(excel);
    } catch (error) {
      next(error);
    }
  };
}
