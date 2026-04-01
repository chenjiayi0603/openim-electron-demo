import { FC } from "react";
import { useTranslation } from "react-i18next";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const VideoMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const url = message.videoElem?.videoUrl;
  const snapshot = message.videoElem?.snapshotUrl;

  return (
    <div className={styles.bubble}>
      {url ? (
        <video
          controls
          src={url}
          poster={snapshot}
          className="max-w-[240px] max-h-[180px] rounded"
        >
          {t("messageDescription.videoMessage")}
        </video>
      ) : (
        <span>{t("messageDescription.videoMessage")}</span>
      )}
    </div>
  );
};

export default VideoMessageRender;
