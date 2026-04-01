import { FC } from "react";
import { useTranslation } from "react-i18next";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const MergeMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const merge = message.mergeElem;

  return (
    <div className={`${styles["card-shadow"]} p-3`}>
      <div className="mb-1 font-medium text-sm truncate">
        {merge?.title ?? t("messageDescription.mergeMessage")}
      </div>
      {merge?.abstractList?.slice(0, 3).map((line, i) => (
        <div key={i} className="text-xs text-[var(--sub-text)] truncate">{line}</div>
      ))}
      <div className="mt-2 border-t border-[var(--gap-text)] pt-1 text-xs text-[var(--sub-text)]">
        {t("messageDescription.mergeMessage")}
      </div>
    </div>
  );
};

export default MergeMessageRender;
