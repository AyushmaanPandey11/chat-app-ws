export type UserState = {
  name: string;
  users: number;
  code: string;
};

export type MessageBody = {
  type: "sent" | "received" | "notification" | "left";
  username?: string;
  msg: string;
};
export type Messages = {
  messages: MessageBody[];
};
