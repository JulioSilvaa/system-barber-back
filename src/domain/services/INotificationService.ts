export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

export interface INotificationService {
  sendToBarbershop(barbershopId: string, payload: NotificationPayload): Promise<void>;
  sendToEndpoint(
    endpoint: string,
    p256dh: string,
    auth: string,
    payload: NotificationPayload,
  ): Promise<void>;
}
