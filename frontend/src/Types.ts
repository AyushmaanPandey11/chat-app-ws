export type UserState = {
  name: string;
  users: number;
  code: string;
};

export type MessageBody = {
  username: string;
  msg: string;
};
export type Messages = {
  sentMessages: string[];
  receivedMessages: MessageBody[];
};
