import { FC } from "react";
import { useTranslation } from "react-i18next";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const LocationMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();
  const loc = message.locationElem;
  const mapUrl = loc
    ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
    : undefined;

  return (
    <div className={styles.bubble}>
      <a
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-[var(--primary)]"
      >
        <span className="text-xl">📍</span>
        <span className="flex flex-col">
          <span className="text-sm">
            {loc?.description || t("messageDescription.locationMessage", { location: "" })}
          </span>
          {loc && (
            <span className="text-xs text-[var(--sub-text)]">
              {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
            </span>
          )}
        </span>
      </a>
    </div>
  );
};

export default LocationMessageRender;
