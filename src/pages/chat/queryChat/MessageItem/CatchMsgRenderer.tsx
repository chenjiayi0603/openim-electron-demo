import { FC } from "react";
import { useTranslation } from "react-i18next";

import { formatBr } from "@/utils/common";
import { formatMessageByType } from "@/utils/imCommon";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const CatchMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const fallbackByType = formatMessageByType(message);
  const fromText = message.textElem?.content?.trim();
  const fromAtText = message.atTextElem?.text?.trim();
  const fromCustom = message.customElem?.description?.trim();
  let fromNotification = message.notificationElem?.detail?.trim();
  if (fromNotification === t("messageDescription.catchMessage")) {
    fromNotification = "";
  }
  const content =
    fallbackByType ||
    fromText ||
    fromAtText ||
    fromCustom ||
    fromNotification ||
    t("messageDescription.catchMessage");

  return (
    <div
      className={styles.bubble}
      dangerouslySetInnerHTML={{ __html: formatBr(content) }}
    ></div>
  );
};

export default CatchMessageRender;
