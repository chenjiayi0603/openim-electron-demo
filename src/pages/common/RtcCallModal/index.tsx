import "@livekit/components-styles";

import { LiveKitRoom } from "@livekit/components-react";
import { t } from "i18next";
import {
  forwardRef,
  ForwardRefRenderFunction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import DraggableModalWrap from "@/components/DraggableModalWrap";
import { CustomType } from "@/constants";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { feedbackToast, formatErrorDetails } from "@/utils/common";

import { AuthData, InviteData } from "./data";
import { RtcLayout } from "./RtcLayout";

interface IRtcCallModalProps {
  inviteData: InviteData;
}

const RtcCallModal: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  IRtcCallModalProps
> = ({ inviteData }, ref) => {
  const rawInvitation = inviteData.invitation;
  const invitation = rawInvitation
    ? {
        ...rawInvitation,
        inviterUserID:
          rawInvitation.inviterUserID || inviteData.participant?.userInfo?.userID || "",
      }
    : undefined;
  const [connect, setConnect] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [authData, setAuthData] = useState<AuthData>({
    serverUrl: "",
    token: "",
  });
  const selfID = useUserStore((state) => state.selfInfo.userID);
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const timer = useRef<NodeJS.Timeout>();

  const isRecv = selfID !== invitation?.inviterUserID;

  useEffect(() => {
    if (!isOverlayOpen) return;
    tryInvite();
  }, [isOverlayOpen, isRecv]);

  const checkTimeout = () => {
    if (timer.current) clearTimer();
    timer.current = setTimeout(() => {
      clearTimer();

      if (!invitation) return;

      void sendCustomSignal(invitation?.inviteeUserIDList[0], CustomType.CallingCancel).catch(
        (error) => {
          console.error(
            "[RtcCallModal] timeout CallingCancel failed",
            formatErrorDetails(error),
            error,
          );
        },
      );
      closeOverlay();
    }, (invitation?.timeout ?? 30) * 1000);
  };

  const clearTimer = useCallback(() => clearTimeout(timer.current), []);

  const closeOverlayAndClearTimer = useCallback(() => {
    clearTimer();
    closeOverlay();
  }, []);

  const sendCustomSignal = useCallback(
    async (recvID: string, customType: CustomType) => {
      const data = {
        customType,
        data: {
          ...invitation,
        },
      };
      const { data: message } = await IMSDK.createCustomMessage({
        data: JSON.stringify(data),
        extension: "",
        description: "",
      });
      await IMSDK.sendMessage({
        recvID,
        message,
        groupID: "",
        // false：离线/弱网也可落库同步，避免对方未实时在线时邀请、接听信令丢失；true 仅在线投递易一直卡在拨号界面
        isOnlineOnly: false,
      });
    },
    [invitation?.roomID],
  );

  const tryInvite = async () => {
    if (!isRecv) {
      try {
        await sendCustomSignal(
          invitation.inviteeUserIDList[0],
          CustomType.CallingInvite,
        );
        checkTimeout();
      } catch (error) {
        feedbackToast({ msg: t("toast.inviteUserFailed"), error });
        closeOverlay();
      }
    }
  };

  const connectRtc = useCallback((data?: AuthData) => {
    if (data) {
      setAuthData(data);
    }
    clearTimer();
    setTimeout(() => setConnect(true));
  }, []);

  return (
    <DraggableModalWrap
      title={null}
      footer={null}
      open={isOverlayOpen}
      closable={false}
      maskClosable={false}
      keyboard={false}
      mask={false}
      centered
      width="auto"
      onCancel={closeOverlay}
      destroyOnClose
      ignoreClasses=".ignore-drag, .no-padding-modal, .cursor-pointer"
      className="no-padding-modal rtc-single-modal"
      wrapClassName="pointer-events-none"
    >
      {/* wrap 使用 pointer-events-none 时，部分环境下子树需显式 auto，否则麦/摄像头按钮点不动（Electron 尤甚） */}
      <div className="pointer-events-auto">
        {isOverlayOpen && (
          <LiveKitRoom
            serverUrl={authData.serverUrl}
            token={authData.token}
            video={invitation?.mediaType === "video"}
            audio={true}
            connect={connect}
            options={{
              publishDefaults: {
                videoCodec: "vp9",
                backupCodec: { codec: "vp8" },
              },
            }}
            onConnected={() => setIsConnected(true)}
            onDisconnected={() => {
              closeOverlayAndClearTimer();
              setIsConnected(false);
              setConnect(false);
            }}
          >
            <RtcLayout
              connect={connect}
              isConnected={isConnected}
              isRecv={isRecv}
              inviteData={inviteData}
              sendCustomSignal={sendCustomSignal}
              connectRtc={connectRtc}
              closeOverlay={closeOverlayAndClearTimer}
            />
          </LiveKitRoom>
        )}
      </div>
    </DraggableModalWrap>
  );
};

export default forwardRef(RtcCallModal);
