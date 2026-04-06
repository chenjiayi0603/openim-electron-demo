import { message } from "@/AntdGlobalComp";
import { ErrCodeMap } from "@/constants";
import { t } from "i18next";

interface ErrorData {
  errCode: number;
  errMsg?: string;
  errDlt?: string;
}

function resolveErrorText(errData: ErrorData): string | undefined {
  const dlt = errData.errDlt ?? "";
  if (
    errData.errCode === 1002 &&
    (dlt.includes("temporarily locked") || dlt.includes("login temporarily locked"))
  ) {
    return t("errCode.loginTemporarilyLocked");
  }
  if (ErrCodeMap[errData.errCode]) {
    return ErrCodeMap[errData.errCode];
  }
  return errData.errMsg;
}

/** One slot so parallel failures (e.g. repeated login) do not stack identical toasts. */
const API_ERROR_TOAST_KEY = "openim-api-error";

export const errorHandle = (err: unknown) => {
  const errData = err as ErrorData;
  const text = resolveErrorText(errData);
  if (text) {
    message.open({
      type: "error",
      content: text,
      key: API_ERROR_TOAST_KEY,
      duration: 4,
    });
  }
};
