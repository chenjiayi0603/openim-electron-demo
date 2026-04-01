import {
  TrackToggle,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { CbEvents, MessageType } from "@openim/wasm-client-sdk";
import {
  MessageItem,
  RtcInvite,
  WSEvent,
} from "@openim/wasm-client-sdk/lib/types/entity";
import clsx from "clsx";
import { t } from "i18next";
import { RemoteParticipant, RoomEvent, Track } from "livekit-client";
import { useEffect, useRef } from "react";

import { getRtcConnectData } from "@/api/imApi";
import rtc_accept from "@/assets/images/rtc/rtc_accept.png";
import rtc_camera from "@/assets/images/rtc/rtc_camera.png";
import rtc_camera_off from "@/assets/images/rtc/rtc_camera_off.png";
import rtc_hungup from "@/assets/images/rtc/rtc_hungup.png";
import rtc_mic from "@/assets/images/rtc/rtc_mic.png";
import rtc_mic_off from "@/assets/images/rtc/rtc_mic_off.png";
import { CustomType } from "@/constants";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { feedbackToast, formatErrorDetails } from "@/utils/common";

import { CounterHandle, ForwardCounter } from "./Counter";
import { AuthData } from "./data";

interface IRtcControlProps {
  isWaiting: boolean;
  isRecv: boolean;
  isConnected: boolean;
  invitation: RtcInvite;
  connectRtc: (data?: AuthData) => void;
  closeOverlay: () => void;
  sendCustomSignal: (recvID: string, customType: CustomType) => Promise<void>;
}

const resolvePeerUserID = (
  invitation: RtcInvite,
  selfID: string,
  isRecv: boolean,
): string => {
  const inviter = invitation.inviterUserID;
  const inviteePeer = invitation.inviteeUserIDList?.find((id) => id && id !== selfID);
  if (isRecv && inviter) return inviter;
  if (!isRecv && inviteePeer) return inviteePeer;

  const extra = invitation as unknown as {
    request?: { fromUserID?: string; toUserID?: string };
    fromToUserID?: { fromUserID?: string; toUserID?: string };
  };
  const requestPeer =
    extra.request?.fromUserID === selfID
      ? extra.request?.toUserID
      : extra.request?.fromUserID;
  if (requestPeer) return requestPeer;
  const pairPeer =
    extra.fromToUserID?.fromUserID === selfID
      ? extra.fromToUserID?.toUserID
      : extra.fromToUserID?.fromUserID;
  return pairPeer ?? "";
};
export const RtcControl = ({
  isWaiting,
  isRecv,
  isConnected,
  invitation,
  connectRtc,
  closeOverlay,
  sendCustomSignal,
}: IRtcControlProps) => {
  const room = useRoomContext();
  const selfID = useUserStore((state) => state.selfInfo.userID);
  const localParticipantState = useLocalParticipant();
  const counterRef = useRef<CounterHandle>(null);

  const recvID = resolvePeerUserID(invitation, selfID, isRecv);
  const isVideoCall = invitation.mediaType === "video";

  useEffect(() => {
    const acceptHandler = async ({ roomID }: RtcInvite) => {
      if (invitation.roomID !== roomID) return;
      try {
        const { data } = await getRtcConnectData(
          roomID,
          useUserStore.getState().selfInfo.userID,
        );
        connectRtc(data);
      } catch (error) {
        // 主叫收到对方 CallingAccept 后拉 token；未 catch 会导致 Uncaught (in promise)
        feedbackToast({ msg: t("toast.rtcTokenFailed"), error });
        closeOverlay();
      }
    };
    const rejectHandler = ({ roomID }: RtcInvite) => {
      if (invitation.roomID !== roomID) return;
      closeOverlay();
    };
    const hangupHandler = ({ roomID }: RtcInvite) => {
      if (invitation.roomID !== roomID) return;
      room.disconnect();
      closeOverlay();
    };
    const cancelHandler = ({ roomID }: RtcInvite) => {
      if (invitation.roomID !== roomID) return;
      if (!isWaiting) return;
      closeOverlay();
    };
    const participantDisconnectedHandler = (remoteParticipant: RemoteParticipant) => {
      const identity = remoteParticipant.identity;
      if (
        identity === invitation.inviterUserID ||
        identity === invitation.inviteeUserIDList[0]
      ) {
        room.disconnect();
      }
    };

    const newMessageHandler = ({ data }: WSEvent<MessageItem[]>) => {
      data.map((message) => {
        if (message.contentType === MessageType.CustomMessage) {
          const customData = JSON.parse(message.customElem!.data) as {
            data: RtcInvite;
            customType: CustomType;
          };
          if (customData.customType === CustomType.CallingAccept) {
            void acceptHandler(customData.data);
          }
          if (customData.customType === CustomType.CallingReject) {
            rejectHandler(customData.data);
          }
          if (customData.customType === CustomType.CallingCancel) {
            cancelHandler(customData.data);
          }
          if (customData.customType === CustomType.CallingHungup) {
            hangupHandler(customData.data);
          }
        }
      });
    };

    IMSDK.on(CbEvents.OnRecvNewMessages, newMessageHandler);
    room.on(RoomEvent.ParticipantDisconnected, participantDisconnectedHandler);
    return () => {
      IMSDK.off(CbEvents.OnRecvNewMessages, newMessageHandler);
      room.off(RoomEvent.ParticipantDisconnected, participantDisconnectedHandler);
    };
  }, [room, invitation.roomID, isWaiting, connectRtc, closeOverlay]);

  const hungup = () => {
    if (!recvID) {
      feedbackToast({ msg: t("toast.rtcAcceptSignalFailed"), error: "missing recvID" });
      closeOverlay();
      return;
    }
    const onSignalFail = (error: unknown) => {
      console.error(
        "[RtcControl] sendCustomSignal failed",
        formatErrorDetails(error),
        error,
      );
    };
    if (isWaiting) {
      const customType = isRecv ? CustomType.CallingReject : CustomType.CallingCancel;
      void sendCustomSignal(recvID, customType).catch(onSignalFail);
      closeOverlay();
      return;
    }
    void sendCustomSignal(recvID, CustomType.CallingHungup).catch(onSignalFail);
    room.disconnect();
  };

  const acceptInvitation = async () => {
    if (!recvID) {
      feedbackToast({ msg: t("toast.rtcAcceptSignalFailed"), error: "missing recvID" });
      closeOverlay();
      return;
    }
    try {
      await sendCustomSignal(recvID, CustomType.CallingAccept);
    } catch (error) {
      const code = (error as { errCode?: number })?.errCode;
      const msg =
        code === 1004
          ? `${t("toast.rtcAcceptSignalFailed")} ${t("toast.rtcAcceptSignal1004")}`
          : t("toast.rtcAcceptSignalFailed");
      feedbackToast({ msg, error });
      closeOverlay();
      return;
    }
    try {
      const { data } = await getRtcConnectData(
        invitation.roomID,
        useUserStore.getState().selfInfo.userID,
      );
      connectRtc(data);
    } catch (error) {
      feedbackToast({ msg: t("toast.rtcTokenFailed"), error });
      closeOverlay();
    }
  };

  return (
    <div className="ignore-drag absolute bottom-[6%] z-10 flex justify-center">
      {!isWaiting && (
        <ForwardCounter
          ref={counterRef}
          className={clsx("absolute -top-8")}
          isConnected={isConnected}
        />
      )}
      {!isWaiting && (
        <TrackToggle
          className="flex cursor-pointer flex-col items-center !justify-start !gap-0 !p-0"
          source={Track.Source.Microphone}
          showIcon={false}
        >
          <img
            width={48}
            src={localParticipantState.isMicrophoneEnabled ? rtc_mic : rtc_mic_off}
            alt=""
          />
          <span className="mt-2 text-xs text-white">{t("placeholder.microphone")}</span>
        </TrackToggle>
      )}
      <div
        className={clsx("ml-12 flex cursor-pointer flex-col items-center", {
          "mr-12": isVideoCall,
          "!mx-0": !isRecv && isWaiting,
        })}
        onClick={hungup}
      >
        <img width={48} src={rtc_hungup} alt="" />
        <span
          className={clsx("mt-2 text-xs text-white", {
            "!text-[var(--sub-text)]": isWaiting,
          })}
        >
          {isWaiting ? t("cancel") : t("hangUp")}
        </span>
      </div>
      {isRecv && isWaiting && (
        <div
          className="mx-12 flex cursor-pointer flex-col items-center"
          onClick={acceptInvitation}
        >
          <img width={48} src={rtc_accept} alt="" />
          <span
            className={clsx("mt-2 text-xs text-white", {
              "!text-[var(--sub-text)]": isWaiting,
            })}
          >
            {t("answer")}
          </span>
        </div>
      )}
      {!isWaiting && isVideoCall && (
        <TrackToggle
          className="flex cursor-pointer flex-col items-center justify-start !gap-0 !p-0"
          source={Track.Source.Camera}
          showIcon={false}
        >
          <img
            width={48}
            src={localParticipantState.isCameraEnabled ? rtc_camera : rtc_camera_off}
            alt=""
          />
          <span className="mt-2 text-xs text-white">{t("placeholder.camera")}</span>
        </TrackToggle>
      )}
    </div>
  );
};
