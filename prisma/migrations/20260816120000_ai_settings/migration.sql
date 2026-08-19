-- AI/Copilot settings per barbershop (Hub IA do dono — configuração persistida)

CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "followUpDays" INTEGER NOT NULL DEFAULT 30,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "messageTemplate" TEXT NOT NULL DEFAULT 'Olá, {nome}! Faz algum tempo que você não passa por aqui. Quer reservar seu horário? A gente te espera!',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_settings_barbershopId_key" UNIQUE ("barbershopId")
);

CREATE INDEX "ai_settings_barbershopId_idx" ON "ai_settings"("barbershopId");

ALTER TABLE "ai_settings"
    ADD CONSTRAINT "ai_settings_barbershopId_fkey"
    FOREIGN KEY ("barbershopId")
    REFERENCES "barbershops"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
