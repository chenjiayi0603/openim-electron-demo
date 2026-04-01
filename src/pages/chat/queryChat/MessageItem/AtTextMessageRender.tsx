import { FC } from "react";

import { formatBr } from "@/utils/common";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const AtTextMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const text = message.atTextElem?.text ?? "";
  return (
    <div
      className={styles.bubble}
      dangerouslySetInnerHTML={{ __html: formatBr(text) }}
    />
  );
};

export default AtTextMessageRender;
