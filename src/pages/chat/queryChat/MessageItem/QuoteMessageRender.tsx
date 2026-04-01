import { FC } from "react";
import { useTranslation } from "react-i18next";

import { formatBr } from "@/utils/common";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const QuoteMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const quote = message.quoteElem;
  const quotedText = quote?.quoteMessage?.textElem?.content;

  return (
    <div className={styles.bubble}>
      {quote?.quoteMessage && (
        <div className="mb-1 border-l-2 border-[var(--primary)] pl-2 text-xs text-[var(--sub-text)] max-w-[200px] truncate">
          {quotedText ?? t("messageDescription.quoteMessage")}
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: formatBr(quote?.text ?? "") }} />
    </div>
  );
};

export default QuoteMessageRender;
