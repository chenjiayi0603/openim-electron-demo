import { FC } from "react";
import { useTranslation } from "react-i18next";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const VoiceMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const duration = message.soundElem?.duration ?? 0;
  const url = message.soundElem?.sourceUrl;

  return (
    <div className={styles.bubble}>
      {url ? (
        <audio controls src={url} className="max-w-[240px]">
          {t("messageDescription.voiceMessage")}
        </audio>
      ) : (
        <span>{t("messageDescription.voiceMessage")}{duration > 0 ? ` ${duration}″` : ""}</span>
      )}
    </div>
  );
};

export default VoiceMessageRender;
