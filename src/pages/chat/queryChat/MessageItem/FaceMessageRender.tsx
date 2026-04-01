import { FC } from "react";
import { useTranslation } from "react-i18next";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const FaceMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const face = message.faceElem;

  return (
    <div className={styles.bubble}>
      {face?.data ? (
        <img src={face.data} alt={t("messageDescription.faceMessage")} className="max-w-[80px]" />
      ) : (
        <span>{t("messageDescription.faceMessage")}</span>
      )}
    </div>
  );
};

export default FaceMessageRender;
