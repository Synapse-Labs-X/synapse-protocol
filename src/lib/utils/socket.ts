// src/lib/utils/socket.ts
import { io, Socket } from "socket.io-client";

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080",
        {
          transports: ["websocket"],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        }
      );
    }
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }
    return this.socket;
  }
}

export const socketManager = SocketManager.getInstance();
