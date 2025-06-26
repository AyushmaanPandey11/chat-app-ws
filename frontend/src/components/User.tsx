import React from "react";

type ReceivedMessageProp = {
  msg: string;
  name: string;
};

type SendMessageProp = {
  msg: string;
};

export const SendMessageBox = React.memo(({ msg }: SendMessageProp) => {
  return (
    <div className="flex justify-end w-full flex-col items-end">
      <div className="text-black bg-white rounded-md p-1 m-0 my-0 text-[0.6rem] lg:text-xs max-w-[90%] self-end">
        {msg}
      </div>
    </div>
  );
});

// ReceivedMessageBox: Aligns message to the left
export const ReceivedMessageBox = React.memo(
  ({ msg, name }: ReceivedMessageProp) => {
    return (
      <div className="flex justify-start w-full flex-col items-start">
        <p className="text-white px-1 text-[0.6rem] text-left">{name}</p>
        <div className="text-black bg-white rounded-md p-1 m-0 my-0 text-[0.6rem] lg:text-xs max-w-[90%] self-start">
          {msg}
        </div>
      </div>
    );
  }
);

export const NotificationBox = React.memo(({ msg }: { msg: string }) => {
  return (
    <div className="flex  justify-center w-full">
      <p className="text-center rounded-sm px-2 text-[0.5rem] lg:text-xs text-black bg-blue-300">
        {msg}
      </p>
    </div>
  );
});
