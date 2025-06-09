import { WebSocketServer, WebSocket } from "ws";
import { User } from "./types";

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server is running on ws://localhost:8080");

let sockets: User[] = [];

wss.on("connection", (socket) => {
  //   sockets.push(socket);

  socket.on("message", (message) => {
    const parsedMessage = JSON.parse(message.toString() as string);
    if (parsedMessage.type == "join") {
      sockets.push({
        roomId: parsedMessage.payload.roomId,
        name: parsedMessage.payload.name,
        socket: socket,
      });
    }
    if (parsedMessage.type == "chat") {
      const userRoom = sockets.find(
        (s) => s.roomId === parsedMessage.payload.roomId
      );
      if (userRoom) {
        const messagetoSend = {
          sender: parsedMessage.payload.name,
          message: parsedMessage.payload.message,
        };
        userRoom.socket.send(JSON.stringify(messagetoSend));
      }
    }
  });
  //   socket.on("disconnect", () => {
  //     sockets = sockets.filter((x) => x != socket);
  //   });
});
