import { MessageStatus } from "@openim/wasm-client-sdk";
import { Image, Spin } from "antd";
import { FC } from "react";

import { IMessageItemProps } from ".";

const min = (a: number, b: number) => (a > b ? b : a);

/** 消息里若为 host:port/path 且漏写 scheme，浏览器会当成相对当前页路径（如 localhost:5173/172.x.x.x:10002/...）导致 404 */
function ensureAbsoluteImageSrc(url: string | undefined): string {
  if (!url) return "";
  const u = url.trim();
  if (/^(https?:|\/\/|data:|blob:)/i.test(u)) return u;
  if (/^[\w.-]+:\d+(\/|$)/.test(u)) return `http://${u}`;
  return u;
}

const MediaMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const imageHeight = message.pictureElem!.sourcePicture.height;
  const imageWidth = message.pictureElem!.sourcePicture.width;
  const snapshotMaxHeight = message.pictureElem!.snapshotPicture?.height ?? imageHeight;
  const minHeight = min(200, imageWidth) * (imageHeight / imageWidth) + 2;
  const adaptedHight = min(minHeight, snapshotMaxHeight) + 10;
  const adaptedWidth = min(imageWidth, 200) + 10;

  const rawUrl =
    message.pictureElem!.snapshotPicture?.url || message.pictureElem!.sourcePicture.url;
  const sourceUrl = ensureAbsoluteImageSrc(rawUrl);
  const isSending = message.status === MessageStatus.Sending;
  const minStyle = { minHeight: `${adaptedHight}px`, minWidth: `${adaptedWidth}px` };

  return (
    <Spin spinning={isSending}>
      <div className="relative max-w-[200px]" style={minStyle}>
        <Image
          rootClassName="message-image cursor-pointer"
          className="max-w-[200px] rounded-md"
          src={sourceUrl}
          preview
          placeholder={
            <div style={minStyle} className="flex items-center justify-center">
              <Spin />
            </div>
          }
        />
      </div>
    </Spin>
  );
};

export default MediaMessageRender;
