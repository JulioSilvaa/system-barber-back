import type { IEmailSender, SendEmailInput } from '@/domain/services/IEmailSender';

export default class ConsoleEmailSender implements IEmailSender {
  async send(input: SendEmailInput): Promise<void> {
    console.log(`[EMAIL] Para: ${input.to} | Assunto: ${input.subject}\n${input.text}`);
  }
}
