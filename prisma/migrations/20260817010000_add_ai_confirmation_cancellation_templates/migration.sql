ALTER TABLE "ai_settings" ADD COLUMN "confirmationTemplate" TEXT NOT NULL DEFAULT 'Olá, {nome}! Seu agendamento para {data} às {hora} está confirmado. Até lá!';
ALTER TABLE "ai_settings" ADD COLUMN "cancellationTemplate" TEXT NOT NULL DEFAULT 'Olá, {nome}. Recebemos o cancelamento do seu agendamento em {data}. Se quiser reagendar, é só chamar!';
