import React from "react";

type SendMessageProp = {
  msg: string;
  idx: number;
};
export const SendMessageBox = React.memo(({ msg, idx }: SendMessageProp) => {
  return (
    <div key={`sent-${idx}`} className="flex justify-end w-full">
      <div className="text-black text-right bg-white rounded-lg p-2 m-2 text-lg max-w-[75%]">
        {msg}
      </div>
    </div>
  );
});

export const ReceivedMessageBox = React.memo(
  ({ msg, idx }: SendMessageProp) => {
    return (
      <div key={`sent-${idx}`} className="flex justify-start w-full">
        <div className="text-black text-right bg-white rounded-lg p-2 m-2 text-lg max-w-[75%]">
          {msg}
        </div>
      </div>
    );
  }
);
