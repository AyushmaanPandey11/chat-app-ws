import { WebSocket } from "ws";
export interface User {
  roomId: string;
  name: string;
  socket: WebSocket;
}
