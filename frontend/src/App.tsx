import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import type { Messages, UserState } from "./Types";
import { ReceivedMessageBox, SendMessageBox } from "./components/User";

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [roomNo, setRoomNo] = useState("");
  const [name, setName] = useState("");

  const [messages, setMessages] = useState<Messages>({
    sentMessages: ["Hi There!!"],
    receivedMessages: ["Yo!!!"],
  });

  const [data, setData] = useState<UserState>({
    name: "",
    users: 0,
    code: "",
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onmessage = (event) => {
      console.log("Message received:", event.data);
      if (event.data.count) {
        setData((prev) => ({
          ...prev,
          users: Number(event.data?.count),
        }));
      } else {
        if (event.data.payload && event.data.payload.name !== data.name) {
          setMessages((prev) => ({
            ...prev,
            receivedMessages: [...prev.receivedMessages, event.data],
          }));
        } else {
          setMessages((prev) => ({
            ...prev,
            sentMessages: [...prev.sentMessages, event.data],
          }));
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const handleSend = useCallback(() => {
    const message = inputRef.current?.value?.trim();
    if (!message) return;

    setMessages((prev) => ({
      ...prev,
      sentMessages: [...prev.sentMessages, message],
    }));

    const messageBody = {
      type: "chat",
      payload: {
        roomId: roomNo,
        sender: name,
        message: message,
      },
    };
    wsRef.current?.send(JSON.stringify(messageBody));

    if (inputRef.current) inputRef.current.value = "";
  }, [name, roomNo]);

  const handleCreateRoom = useCallback(() => {
    const code = inputRef.current?.value?.trim() as string;
    const name = nameRef.current?.value?.trim() as string;
    setRoomNo(code);
    setName(name);
    if (!code || !name) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "join",
          payload: {
            roomId: code,
            name: name,
          },
        })
      );
    } else {
      wsRef.current!.onopen = () => {
        wsRef.current?.send(
          JSON.stringify({
            type: "join",
            payload: {
              roomId: code,
              name: name,
            },
          })
        );
      };
    }

    setData((prev) => ({
      ...prev,
      users: prev.users + 1,
      code: code,
      name: name,
    }));

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
            <div className="flex flex-col justify-start mx-auto border-2 border-white rounded-xl p-4 m-2 w-10/12 items-start space-y-4 overflow-y-auto">
              {[...messages.sentMessages, ...messages.receivedMessages].map(
                (msg, idx) => {
                  const isSent = messages.sentMessages.includes(msg);
                  return isSent ? (
                    <SendMessageBox key={`sent-${idx}`} msg={msg} idx={idx} />
                  ) : (
                    <ReceivedMessageBox
                      key={`recv-${idx}`}
                      msg={msg}
                      idx={idx}
                    />
                  );
                }
              )}
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
