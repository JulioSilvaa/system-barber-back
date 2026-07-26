import { describe, expect, it } from 'vitest';

import { Appointment, Barbershop, Service, User } from './index';

describe('Domain entities', () => {
  it('should create a barbershop with a valid slug', () => {
    const barbershop = new Barbershop({
      id: 'barbershop-1',
      name: 'Barbershop Central',
      slug: 'barbershop-central',
      phone: '(11) 99999-0000',
    });

    expect(barbershop.slug).toBe('barbershop-central');
    expect(barbershop.isActive).toBe(true);
  });

  it('should reject an invalid slug for the barbershop', () => {
    expect(
      () =>
        new Barbershop({
          id: 'barbershop-2',
          name: 'Barbershop',
          slug: 'Barbershop Central',
          phone: '(11) 99999-0000',
        }),
    ).toThrow('slug must contain only lowercase letters, numbers, and hyphens');
  });

  it('should identify admin and barber users', () => {
    const admin = new User({
      id: 'user-1',
      barbershopId: 'barbershop-1',
      name: 'Ana',
      email: 'ana@barbershop.com',
      passwordHash: 'hash',
      role: 'ADMIN',
    });

    const barber = new User({
      id: 'user-2',
      barbershopId: 'barbershop-1',
      name: 'Bruno',
      email: 'bruno@barbershop.com',
      passwordHash: 'hash',
      role: 'BARBER',
    });

    expect(admin.isAdmin()).toBe(true);
    expect(barber.isAdmin()).toBe(false);
    expect(barber.isBarber()).toBe(true);
  });

  it('should prevent services with invalid price or duration', () => {
    expect(
      () =>
        new Service({
          id: 'service-1',
          barbershopId: 'barbershop-1',
          name: 'Cut',
          priceCents: 0,
          durationMinutes: 30,
        }),
    ).toThrow('price must be greater than zero');

    expect(
      () =>
        new Service({
          id: 'service-2',
          barbershopId: 'barbershop-1',
          name: 'Beard',
          priceCents: 2500,
          durationMinutes: 0,
        }),
    ).toThrow('duration must be greater than zero');
  });

  it('should validate overlap and prevent cancellation after completion', () => {
    const inicio = new Date('2026-07-25T15:00:00.000Z');
    const fim = new Date('2026-07-25T15:30:00.000Z');
    const outroFim = new Date('2026-07-25T15:45:00.000Z');

    const appointment = new Appointment({
      id: 'appointment-1',
      barbershopId: 'barbershop-1',
      barberId: 'user-2',
      serviceId: 'service-1',
      customerName: 'Carlos',
      customerPhone: '(11) 98888-0000',
      startDate: inicio,
      endDate: fim,
    });

    const conflict = new Appointment({
      id: 'appointment-2',
      barbershopId: 'barbershop-1',
      barberId: 'user-2',
      serviceId: 'service-1',
      customerName: 'Maria',
      customerPhone: '(11) 97777-0000',
      startDate: new Date('2026-07-25T15:15:00.000Z'),
      endDate: outroFim,
    });

    expect(appointment.isOverlappingWith(conflict)).toBe(true);

    appointment.complete();

    expect(() => appointment.cancel()).toThrow('appointment already completed');
  });
});
