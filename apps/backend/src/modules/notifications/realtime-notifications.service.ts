import { Injectable, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

@Injectable()
export class RealtimeNotificationsService {
  private readonly logger = new Logger(RealtimeNotificationsService.name);
  private server: Server | null = null;

  registerServer(server: Server) {
    this.server = server;
  }

  getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  joinUserRoom(client: Socket, userId: string) {
    client.join(this.getUserRoom(userId));
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    if (!this.server) {
      this.logger.warn(`Skipping realtime event ${event} for ${userId}: server not ready`);
      return;
    }

    this.server.to(this.getUserRoom(userId)).emit(event, payload);
  }
}
