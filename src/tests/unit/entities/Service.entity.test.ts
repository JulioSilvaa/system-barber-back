import { describe, expect, it } from 'vitest';
import { Service } from '@/domain/entities/Service';
import { makeServiceProps } from '@/tests/helpers/factories';

describe('Service Entity', () => {
  describe('Criação', () => {
    it('deve criar um serviço válido', () => {
      const service = new Service(makeServiceProps());

      expect(service).toBeInstanceOf(Service);
      expect(service.id).toBe('service-1');
      expect(service.barbershopId).toBe('barbershop-1');
      expect(service.name).toBe('Corte de cabelo');
      expect(service.priceCents).toBe(4000);
      expect(service.durationMinutes).toBe(30);
      expect(service.isActive).toBe(true);
    });

    it('deve definir isActive=true por padrão', () => {
      const service = new Service(makeServiceProps({ isActive: undefined }));

      expect(service.isActive).toBe(true);
    });
  });

  describe('Validação de preço', () => {
    it('deve rejeitar preço zero', () => {
      expect(() => new Service(makeServiceProps({ priceCents: 0 }))).toThrow(
        'price must be greater than zero',
      );
    });

    it('deve rejeitar preço negativo', () => {
      expect(() => new Service(makeServiceProps({ priceCents: -1 }))).toThrow(
        'price must be greater than zero',
      );
    });
  });

  describe('Validação de duração', () => {
    it('deve rejeitar duração zero', () => {
      expect(() => new Service(makeServiceProps({ durationMinutes: 0 }))).toThrow(
        'duration must be greater than zero',
      );
    });

    it('deve rejeitar duração negativa', () => {
      expect(() => new Service(makeServiceProps({ durationMinutes: -10 }))).toThrow(
        'duration must be greater than zero',
      );
    });
  });
});
