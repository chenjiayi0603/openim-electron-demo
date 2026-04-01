import { FC } from "react";
import { useTranslation } from "react-i18next";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

const FileMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const file = message.fileElem;

  return (
    <div className={styles.bubble}>
      {file?.sourceUrl ? (
        <a
          href={file.sourceUrl}
          target="_blank"
          rel="noreferrer"
          download={file.fileName}
          className="flex items-center gap-2 text-[var(--primary)]"
        >
          <span className="text-2xl">📄</span>
          <span className="flex flex-col">
            <span className="max-w-[200px] truncate">{file.fileName}</span>
            {file.fileSize > 0 && (
              <span className="text-xs text-[var(--sub-text)]">{formatFileSize(file.fileSize)}</span>
            )}
          </span>
        </a>
      ) : (
        <span>{t("messageDescription.fileMessage", { file: file?.fileName ?? "" })}</span>
      )}
    </div>
  );
};

export default FileMessageRender;
