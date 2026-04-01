import { FC } from "react";
import { useTranslation } from "react-i18next";

import OIMAvatar from "@/components/OIMAvatar";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const CardMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const card = message.cardElem;

  return (
    <div className={`${styles["card-shadow"]} flex items-center gap-3 p-3`}>
      <OIMAvatar size={40} src={card?.faceURL} text={card?.nickname} />
      <div className="flex flex-col overflow-hidden">
        <span className="truncate font-medium text-sm">{card?.nickname}</span>
        <span className="text-xs text-[var(--sub-text)]">{t("messageDescription.cardMessage")}</span>
      </div>
    </div>
  );
};

export default CardMessageRender;
