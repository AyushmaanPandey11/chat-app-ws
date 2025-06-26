import { WebSocketServer } from "ws";
import { User } from "./types";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

const port = Number(process.env.PORT);
const wss = new WebSocketServer({ port });

console.log(`WebSocket server is running on port ${port}`);

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

      sockets
        .filter((x) => x.roomId === parsedMessage.payload.roomId)
        .forEach((s) =>
          s.socket.send(
            JSON.stringify({
              type: "join",
              message: `${parsedMessage.payload.name} joined the room!`,
              count: count,
              newUser: parsedMessage.payload.name,
            })
          )
        );
    }

    // Handle chat messages
    else if (parsedMessage.type === "chat") {
      const userRoom = sockets.find(
        (s) => s.roomId === parsedMessage.payload.roomId
      );

      if (userRoom) {
        const messagetoSend = {
          sender: parsedMessage.payload.sender,
          message: parsedMessage.payload.message,
        };
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
                payload: messagetoSend,
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
      const otherUsers = sockets.filter(
        (s) => s.roomId === disconnectedUser.roomId && s.socket !== socket
      );

      if (otherUsers.length > 0) {
        otherUsers.forEach((s) =>
          s.socket.send(
            JSON.stringify({
              type: "left",
              payload: {
                message: `${disconnectedUser.name} has left the room`,
                count: otherUsers.length,
              },
            })
          )
        );
      } else {
        sockets = sockets.filter((s) => s.roomId !== disconnectedUser.roomId);
        console.log(`sockets with id ${disconnectedUser.roomId} are cleared`);
      }

      sockets = sockets.filter((s) => s.socket !== socket);
      console.log(
        `${disconnectedUser.name} disconnected from room ${disconnectedUser.roomId}`
      );
    }
  });
});
