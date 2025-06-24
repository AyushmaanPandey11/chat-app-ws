import { WebSocketServer, WebSocket } from "ws";
import { User } from "./types";

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server is running on ws://localhost:8080");

let sockets: User[] = [];

wss.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("message", (message) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message.toString() as string);
      console.log("Received message:", parsedMessage);
    } catch (error) {
      console.error("Failed to parse message", error);
      socket.close();
      return;
    }

    // Handle user joining
    if (parsedMessage.type === "join") {
      const user: User = {
        roomId: parsedMessage.payload.roomId,
        name: parsedMessage.payload.name,
        socket: socket,
      };

      sockets.push(user);
      console.log(
        `${parsedMessage.payload.name} joined room ${parsedMessage.payload.roomId}`
      );
      const count = sockets.filter(
        (x) => x.roomId === parsedMessage.payload.roomId
      ).length;
      socket.send(
        JSON.stringify({
          type: "join",
          message: "Welcome to the room!",
          count: count,
        })
      );

      sockets
        .filter(
          (x) =>
            x.roomId === parsedMessage.payload.roomId &&
            x.name !== parsedMessage.payload.name
        )
        .forEach((s) =>
          s.socket.send(
            JSON.stringify({
              message: "New user joined",
              count: count,
            })
          )
        );
    }

    // Handle chat messages
    if (parsedMessage.type === "chat") {
      const userRoom = sockets.find(
        (s) => s.roomId === parsedMessage.payload.roomId
      );

      if (userRoom) {
        const messagetoSend = {
          sender: parsedMessage.payload.sender,
          message: parsedMessage.payload.message,
        };
        userRoom.socket.send(JSON.stringify(messagetoSend));
        console.log(
          `${parsedMessage.payload.sender} sent a message: ${parsedMessage.payload.message}`
        );

        sockets
          .filter(
            (x) =>
              x.roomId === parsedMessage.payload.roomId &&
              x.name !== parsedMessage.payload.sender
          )
          .forEach((s) =>
            s.socket.send(
              JSON.stringify({
                type: "chat",
                payload: {
                  roomId: parsedMessage.payload.roomId,
                  message: parsedMessage.payload.message,
                  sender: parsedMessage.payload.sender,
                },
              })
            )
          );
      }
    }
  });

  // Handle user disconnection
  socket.on("close", () => {
    const disconnectedUser = sockets.find((s) => s.socket === socket);
    if (disconnectedUser) {
      sockets = sockets.filter((s) => s.socket !== socket); // Remove user from array
      console.log(
        `${disconnectedUser.name} disconnected from room ${disconnectedUser.roomId}`
      );
    }
  });
});
