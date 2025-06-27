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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const currentUserRef = useRef<string>("");
  const [messages, setMessages] = useState<Messages>({ messages: [] });
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const [data, setData] = useState<UserState>({
    name: "",
    users: 0,
    code: "",
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ws = new WebSocket("wss://chat-app-ws-owra.onrender.com");

    // const ws = new WebSocket("ws://localhost:8080");

    ws.onmessage = (event) => {
      if (event.data === "ping") {
        ws.send("pong");
        console.log("Received ping, sent pong");
        return;
      }
      if (event.data === "pong") {
        console.log("Received pong");
        return;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(event.data);
        console.log("Message received:", parsedData);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        return;
      }

      if (parsedData.type === "join") {
        setMessages((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              type: "notification",
              msg:
                parsedData.newUser === currentUserRef.current
                  ? `Welcome ${parsedData.newUser}`
                  : parsedData.message,
              username: parsedData.newUser,
            },
          ],
        }));
        setData((prev) => ({
          ...prev,
          users: Number(parsedData.count) || prev.users,
        }));
      } else if (parsedData.type === "left") {
        setMessages((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              type: "left",
              msg: parsedData.payload.message,
            },
          ],
        }));
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
      } else if (parsedData.type === "typing") {
        const { isTyping, sender } = parsedData.payload;
        setTypingUsers((prev) => {
          if (isTyping && !prev.includes(sender)) {
            return [...prev, sender];
          } else if (!isTyping && prev.includes(sender)) {
            return prev.filter((user) => user !== sender);
          }
          return prev;
        });
      } else if (parsedData.type === "error") {
        console.error("Server error:", parsedData.message);
      }
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
        console.log("Sent ping");
      }
    }, 40000);

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", {
        code: event.code,
        reason: event.reason,
      });
      clearInterval(pingInterval);
    };

    wsRef.current = ws;

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, []);

  const handleTyping = useCallback(() => {
    if (!data.code || !data.name || !inputRef.current) return;

    const isTyping = inputRef.current.value.trim().length > 0;

    if (isTyping === isTypingRef.current) return;

    // Send typing status immediately
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          payload: {
            roomId: data.code,
            sender: data.name,
            isTyping,
          },
        })
      );
      console.log(`Sent typing: ${isTyping}`);
    }

    // Update typing state
    isTypingRef.current = isTyping;

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If user is typing, set timeout to send isTyping: false
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "typing",
              payload: {
                roomId: data.code,
                sender: data.name,
                isTyping: false,
              },
            })
          );
          console.log("Sent typing: false (timeout)");
        }
        isTypingRef.current = false;
      }, 2000);
    }
  }, [data.code, data.name]);

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

    // Clear typing state and send isTyping: false
    if (wsRef.current?.readyState === WebSocket.OPEN && isTypingRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          payload: {
            roomId: data.code,
            sender: data.name,
            isTyping: false,
          },
        })
      );
      console.log("Sent typing: false (message sent)");
      isTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
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
    <div className="h-screen bg-black flex justify-center items-center overscroll-contain">
      <div
        className={`flex flex-col justify-center items-center mx-auto border-white border-2 rounded-2xl w-11/12 sm:w-2/3 xl:w-1/3 lg:w-2/5 ${
          data.code !== "" ? "h-5/6" : "h-3/5 sm:h-3/5 lg:h-1/3"
        }`}
      >
        <div className="mx-auto flex h-1/12 sm:h-2/12 w-full text-white justify-center mb-4 sm:mb-4 lg:mb-0">
          <div className="flex flex-col p-4 m-2 w-10/12 space-y-0 sm:space-y-2">
            <div className="text-white flex flex-col justify-center">
              <span
                className={`font-bold text-left sm:text-[3vw] lg:text-xl sm:mb-1 lg:mb-0 ${
                  data.code == "" ? "text-3xl mb-1" : "text-[2.5vw]"
                }`}
              >
                Real Time Chat
              </span>
              <span
                className={`font-bold text-left sm:text-[1.5vw] lg:text-xs text-white ${
                  data.code == "" ? "text-lg" : "text-[2vw]"
                } `}
              >
                {data.code !== ""
                  ? "Tell Your Friends to join the room!!"
                  : "Unsaved Chat between users using WebSockets"}
              </span>
            </div>
            {data.code !== "" && (
              <div className="flex flex-row justify-between bg-gray-700 rounded-md mt-1 p-1 font-bold text-[0.5rem] lg:text-[0.8rem]">
                <p>Room Code: {data.code}</p>
                <p>Active Users: {data.users}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto flex h-10/12 sm:h-9/12 w-full text-white py-1 p-3 m-1 overflow-y-hidden mt-2 md:mt-5 lg:mt-4">
          {data.code !== "" ? (
            <div className="flex flex-col justify-start mx-auto border-2 border-white rounded-xl p-4 pb-0 m-2 w-10/12 items-start space-y-2 overflow-y-scroll">
              {messages.messages.map((msg, idx) =>
                msg.type === "sent" ? (
                  <SendMessageBox key={`sent-${idx}`} msg={msg.msg} />
                ) : msg.type === "received" ? (
                  <ReceivedMessageBox
                    key={`recv-${idx}`}
                    msg={msg.msg}
                    name={msg.username || "Unknown"}
                  />
                ) : (
                  <NotificationBox msg={msg.msg} key={`notify-${idx}`} />
                )
              )}
              {typingUsers.length > 0 && (
                <div className="text-gray-400 text-sm italic">
                  {typingUsers.join(", ")}{" "}
                  {typingUsers.length > 1 ? "are" : "is"} typing...
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="flex justify-center items-center w-full h-full mt-0 sm:mt-0 lg:mt-4">
              <div
                className="bg-gray-200 text-black hover:cursor-pointer w-10/12 flex justify-center items-center rounded-xl sm:text-[3.3vw] text-3xl lg:text-xl 2xl:text-2xl font-bold sm:p-3 p-7 lg:p-3 2xl:p-6"
                onClick={handleCreateRoom}
              >
                Create New Room
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex justify-center items-center flex-row text-white 2xl:mt-2">
          <div className="flex lg:flex-row flex-col sm:flex-col w-11/12 lg:w-10/12 lg:mb-6 mb-2 sm:mb-2 px-1 sm:pl-4">
            <div className="flex lg:flex-row flex-col sm:flex-col w-full">
              <input
                ref={inputRef}
                placeholder={
                  data.code !== "" ? "Enter your message" : "Enter Room No."
                }
                className={` ${
                  data.code == ""
                    ? "h-8 sm:h-8 sm:w-10/12 "
                    : "h-8 sm:w-10/12 lg:w-full"
                } border-2 w-[73vw] rounded-lg lg:m-2 lg:p-4 lg:px-0.5 lg:my-0 m-4 my-1 p-1 text-xs sm:m-4 sm:my-1 sm:p-1 sm:text-xs lg:text-xs font-bold text-gray-100 bg-gray-800`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (data.code !== "") {
                      handleSend();
                    } else {
                      handleCreateRoom();
                    }
                  }
                }}
                onChange={data.code !== "" ? handleTyping : undefined}
              />
              {data.code == "" && (
                <input
                  ref={nameRef}
                  placeholder="Enter Your Name"
                  className="w-[73vw] sm:w-10/12 h-8 sm:h-8 lg:h-8 m-4 sm:m-4 my-1 sm:my-1 border-2 rounded-lg lg:m-2 lg:p-4 lg:px-0.5 p-1 sm:p-1 lg:my-0 text-xs sm:text-xs lg:text-xs font-bold text-gray-100 bg-gray-800"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateRoom();
                    }
                  }}
                />
              )}
            </div>
            <button
              onClick={data.code !== "" ? handleSend : handleCreateRoom}
              className="cursor-pointer m-4 sm:m-4 h-8 sm:h-8 lg:h-9 w-[73vw] sm:w-10/12 lg:w-1/6 border-2 lg:my-0 rounded-lg lg:m-2 p-1 sm:p-1 lg:p-3 lg:py-0 text-black font-bold bg-white text-sm sm:text-sm lg:text-md"
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
