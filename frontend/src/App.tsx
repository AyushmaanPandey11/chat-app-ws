import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import type { Messages, UserState } from "./Types";
import {
  NotificationBox,
  ReceivedMessageBox,
  SendMessageBox,
} from "./components/User";

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentUserRef = useRef<string>("");

  const [notification, setNotification] = useState<string>("");
  const [messages, setMessages] = useState<Messages>({ messages: [] });

  const [data, setData] = useState<UserState>({
    name: "",
    users: 0,
    code: "",
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    console.log(messages);
  }, [messages]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onmessage = (event) => {
      let parsedData;
      try {
        parsedData = JSON.parse(event.data);
        console.log("Message received:", parsedData);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        return;
      }

      if (parsedData.type === "join") {
        setNotification(
          parsedData.newUser === currentUserRef.current
            ? `Welcome ${parsedData.newUser}`
            : parsedData.message
        );
        setData((prev) => ({
          ...prev,
          users: Number(parsedData.count) || prev.users,
        }));
      } else if (parsedData.type === "left") {
        setNotification(parsedData.payload.message);
        setData((prev) => ({
          ...prev,
          users: Number(parsedData.payload.count) || prev.users,
        }));
      } else if (parsedData.type === "chat") {
        setMessages((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              type: "received",
              msg: parsedData.payload.message,
              username: parsedData.payload.sender,
            },
          ],
        }));
      } else if (parsedData.type === "error") {
        console.error("Server error:", parsedData.message);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", {
        code: event.code,
        reason: event.reason,
      });
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const handleSend = useCallback(() => {
    const message = inputRef.current?.value?.trim();
    if (!message || !data.code || !data.name) {
      console.warn("Cannot send message: missing message, code, or name", {
        message,
        code: data.code,
        name: data.name,
      });
      return;
    }

    setMessages((prev) => ({
      ...prev,
      messages: [...prev.messages, { type: "sent", msg: message }],
    }));

    const messageBody = {
      type: "chat",
      payload: {
        roomId: data.code,
        sender: data.name,
        message,
      },
    };
    console.log("Sending message:", messageBody);
    wsRef.current?.send(JSON.stringify(messageBody));

    if (inputRef.current) inputRef.current.value = "";
  }, [data.name, data.code]);

  const handleCreateRoom = useCallback(() => {
    const code = inputRef.current?.value?.trim();
    const name = nameRef.current?.value?.trim();
    if (!code || !name) {
      console.warn("Cannot join room: missing code or name", { code, name });
      return;
    }
    currentUserRef.current = name;
    setData((prev) => ({
      ...prev,
      code,
      name,
    }));

    const payload = {
      type: "join",
      payload: {
        roomId: code,
        name,
      },
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      wsRef.current!.onopen = () => {
        wsRef.current?.send(JSON.stringify(payload));
      };
    }

    if (inputRef.current) inputRef.current.value = "";
    if (nameRef.current) nameRef.current.value = "";
  }, []);

  return (
    <div className="h-screen bg-black flex justify-center items-center">
      <div
        className={`flex flex-col justify-center items-center mx-auto border-white border-2 rounded-2xl w-1/3 ${
          data.code !== "" ? "h-5/6" : "h-1/3"
        }`}
      >
        <div className="mx-auto flex h-2/12 w-full text-white justify-center">
          <div className="flex flex-col p-4 m-2 w-10/12 space-y-3">
            <div className="text-white flex flex-col justify-center">
              <span className="font-bold text-left text-3xl">
                Real Time Chat
              </span>
              <span className="font-bold text-left text-xl text-white">
                Unsaved Chat between users using WebSockets
              </span>
            </div>
            {data.code !== "" && (
              <div className="flex flex-row justify-between bg-gray-700 rounded-lg p-3 font-bold text-xl">
                <p>Room Code: {data.code}</p>
                <p>Active Users: {data.users}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto flex h-9/12 w-full text-white p-4 m-2 overflow-y-visible">
          {data.code !== "" ? (
            <div className="flex flex-col justify-start mx-auto border-2 border-white rounded-xl p-4 pb-0 m-2 w-10/12 items-start space-y-2 overflow-y-auto">
              {messages.messages.map((msg, idx) =>
                msg.type === "sent" ? (
                  <SendMessageBox key={`sent-${idx}`} msg={msg.msg} />
                ) : (
                  <ReceivedMessageBox
                    key={`recv-${idx}`}
                    msg={msg.msg}
                    name={msg.username || "Unknown"}
                  />
                )
              )}
              <NotificationBox msg={notification} />
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="flex justify-center items-center w-full h-full mt-5">
              <div
                className="bg-gray-200 text-black hover:cursor-pointer w-10/12 flex justify-center items-center rounded-xl text-3xl font-bold p-6"
                onClick={handleCreateRoom}
              >
                Create New Room
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex justify-center items-center flex-row text-white">
          <div className="flex flex-row w-10/12 mb-10">
            <div className="flex flex-row w-full">
              <input
                ref={inputRef}
                placeholder={
                  data.code !== "" ? "Enter your message" : "Enter Room No."
                }
                className={`h-16 ${
                  data.code == "" ? "w-1/2" : "w-full"
                } border-2 rounded-lg m-2 p-4 text-xl font-bold text-gray-100 bg-gray-800`}
              />
              {data.code == "" && (
                <input
                  ref={nameRef}
                  placeholder="Enter your name"
                  className="h-16 w-1/2 border-2 rounded-lg m-2 p-4 text-xl font-bold text-gray-100 bg-gray-800"
                />
              )}
            </div>
            <button
              onClick={data.code !== "" ? handleSend : handleCreateRoom}
              className="cursor-pointer h-16 w-1/6 border-2 rounded-lg m-2 p-4 text-black font-bold bg-white text-2xl"
            >
              {data.code !== "" ? "Send" : "Join"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
