import { FC } from "react";
import { useTranslation } from "react-i18next";

import { CustomType } from "@/constants/im";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const CustomMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const custom = message.customElem;

  let customType: number | undefined;
  try {
    const parsed = JSON.parse(custom?.data ?? "");
    customType = parsed?.customType;
  } catch {
    // not JSON
  }

  const isCallMessage =
    customType === CustomType.CallingInvite ||
    customType === CustomType.CallingAccept ||
    customType === CustomType.CallingReject ||
    customType === CustomType.CallingCancel ||
    customType === CustomType.CallingHungup;

  const displayText = isCallMessage
    ? t("messageDescription.rtcMessage")
    : custom?.description?.trim() || t("messageDescription.customMessage");

  return (
    <div className={styles.bubble}>
      <span>{displayText}</span>
    </div>
  );
};

export default CustomMessageRender;
