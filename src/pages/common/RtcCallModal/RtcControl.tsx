import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { CbEvents, MessageType } from "@openim/wasm-client-sdk";
import {
  MessageItem,
  RtcInvite,
  WSEvent,
} from "@openim/wasm-client-sdk/lib/types/entity";
import clsx from "clsx";
import { t } from "i18next";
import { ParticipantEvent, RemoteParticipant, RoomEvent, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";

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
  const [actionPending, setActionPending] = useState<{
    hungup: boolean;
    accept: boolean;
  }>({
    hungup: false,
    accept: false,
  });
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraMuted, setIsCameraMuted] = useState(false);

  const recvID = resolvePeerUserID(invitation, selfID, isRecv);
  const isVideoCall = invitation.mediaType === "video";

  const toggleMicrophone = async () => {
    if (!isConnected) return;
    let targetMuted = true;
    console.log("[RtcControl] toggleMicrophone", { isConnected, isMicMuted });
    try {
      const micPublication = room.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      const micTrack = micPublication?.track;
      if (micTrack) {
        const currentlyEnabled = !micTrack.isMuted;
        targetMuted = currentlyEnabled; // If currently enabled, we want to mute (targetMuted = true)
        // Optimistically update UI
        setIsMicMuted(targetMuted);
        if (currentlyEnabled) {
          await micTrack.mute();
        } else {
          await micTrack.unmute();
        }
        return;
      }
      const nextEnabled = !localParticipantState.isMicrophoneEnabled;
      targetMuted = !nextEnabled; // If nextEnabled is false, microphone will be disabled (muted)
      // Optimistically update UI
      setIsMicMuted(targetMuted);
      await room.localParticipant.setMicrophoneEnabled(nextEnabled);
    } catch (error) {
      // Revert optimistic update on error
      setIsMicMuted(!targetMuted);
      const details = formatErrorDetails(error);
      console.error("[RtcControl] toggleMicrophone failed", details, error);
      if (!/Requested device not found|NotFoundError/i.test(details)) {
        feedbackToast({ msg: `${t("toast.operateFail")}: ${details}`, error });
      }
    }
  };

  const toggleCamera = async () => {
    if (!isConnected) return;
    let targetMuted = true;
    console.log("[RtcControl] toggleCamera", { isConnected, isCameraMuted });
    console.log("[RtcControl] toggleCamera state", { isCameraEnabled: localParticipantState.isCameraEnabled });
    try {
      const cameraPublication = room.localParticipant.getTrackPublication(
        Track.Source.Camera,
      );
      const cameraTrack = cameraPublication?.track;
      console.log("[RtcControl] toggleCamera track", { hasCameraTrack: !!cameraTrack, isMuted: cameraTrack?.isMuted });
      if (cameraTrack) {
        const currentlyEnabled = !cameraTrack.isMuted;
        console.log("[RtcControl] toggleCamera cameraTrack", { currentlyEnabled, isMuted: cameraTrack.isMuted });
        targetMuted = currentlyEnabled; // If currently enabled, we want to mute (targetMuted = true)
        // Optimistically update UI
        setIsCameraMuted(targetMuted);
        if (currentlyEnabled) {
          await cameraTrack.mute();
        } else {
          await cameraTrack.unmute();
        }
        console.log("[RtcControl] toggleCamera mute/unmute completed");
        return;
      }
      const nextEnabled = !localParticipantState.isCameraEnabled;
      targetMuted = !nextEnabled; // If nextEnabled is false, camera will be disabled (muted)
      // Optimistically update UI
      setIsCameraMuted(targetMuted);
      await room.localParticipant.setCameraEnabled(nextEnabled);
      console.log("[RtcControl] toggleCamera setCameraEnabled completed", { nextEnabled });
    } catch (error) {
      // Revert optimistic update on error
      setIsCameraMuted(!targetMuted);
      const details = formatErrorDetails(error);
      console.error("[RtcControl] toggleCamera failed", details, error);
      if (!/Requested device not found|NotFoundError/i.test(details)) {
        feedbackToast({ msg: `${t("toast.operateFail")}: ${details}`, error });
      }
    }
  };

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

  useEffect(() => {
    const updateMicMutedState = () => {
      const micPublication = room.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      const micTrack = micPublication?.track;
      if (micTrack) {
        setIsMicMuted(micTrack.isMuted);
      } else {
        setIsMicMuted(!localParticipantState.isMicrophoneEnabled);
      }
    };
    const updateCameraMutedState = () => {
      const cameraPublication = room.localParticipant.getTrackPublication(
        Track.Source.Camera,
      );
      const cameraTrack = cameraPublication?.track;
      if (cameraTrack) {
        setIsCameraMuted(cameraTrack.isMuted);
      } else {
        setIsCameraMuted(!localParticipantState.isCameraEnabled);
      }
    };

    // Initial update
    updateMicMutedState();
    updateCameraMutedState();

    // Listen to track events
    const handleTrackMuted = (track: any) => {
      if (track.source === Track.Source.Microphone) {
        setIsMicMuted(true);
      } else if (track.source === Track.Source.Camera) {
        setIsCameraMuted(true);
      }
    };
    const handleTrackUnmuted = (track: any) => {
      if (track.source === Track.Source.Microphone) {
        setIsMicMuted(false);
      } else if (track.source === Track.Source.Camera) {
        setIsCameraMuted(false);
      }
    };
    const handleLocalTrackPublished = (track: any) => {
      if (track.source === Track.Source.Microphone) {
        updateMicMutedState();
      } else if (track.source === Track.Source.Camera) {
        updateCameraMutedState();
      }
    };
    const handleLocalTrackUnpublished = (track: any) => {
      if (track.source === Track.Source.Microphone) {
        updateMicMutedState();
      } else if (track.source === Track.Source.Camera) {
        updateCameraMutedState();
      }
    };

    room.localParticipant.on(ParticipantEvent.TrackMuted, handleTrackMuted);
    room.localParticipant.on(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
    room.localParticipant.on(
      ParticipantEvent.LocalTrackPublished,
      handleLocalTrackPublished,
    );
    room.localParticipant.on(
      ParticipantEvent.LocalTrackUnpublished,
      handleLocalTrackUnpublished,
    );

    return () => {
      room.localParticipant.off(ParticipantEvent.TrackMuted, handleTrackMuted);
      room.localParticipant.off(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
      room.localParticipant.off(
        ParticipantEvent.LocalTrackPublished,
        handleLocalTrackPublished,
      );
      room.localParticipant.off(
        ParticipantEvent.LocalTrackUnpublished,
        handleLocalTrackUnpublished,
      );
    };
  }, [
    room,
    localParticipantState.isMicrophoneEnabled,
    localParticipantState.isCameraEnabled,
  ]);

  const hungup = () => {
    if (actionPending.hungup) return;
    setActionPending((prev) => ({ ...prev, hungup: true }));

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
    if (actionPending.accept) return;
    setActionPending((prev) => ({ ...prev, accept: true }));

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
        <div
          className="flex cursor-pointer flex-col items-center"
          onClick={() => void toggleMicrophone()}
        >
          <img width={48} src={!isMicMuted ? rtc_mic : rtc_mic_off} alt="" />
          <span className="mt-2 text-xs text-white">{t("placeholder.microphone")}</span>
        </div>
      )}
      <div
        className={clsx("ml-12 flex cursor-pointer flex-col items-center", {
          "mr-12": isVideoCall,
          "!mx-0": !isRecv && isWaiting,
          "pointer-events-none opacity-70": actionPending.hungup,
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
          className={clsx("mx-12 flex cursor-pointer flex-col items-center", {
            "pointer-events-none opacity-70": actionPending.accept,
          })}
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
        <div
          className="flex cursor-pointer flex-col items-center"
          onClick={() => void toggleCamera()}
        >
          <img width={48} src={!isCameraMuted ? rtc_camera : rtc_camera_off} alt="" />
          <span className="mt-2 text-xs text-white">{t("placeholder.camera")}</span>
        </div>
      )}
    </div>
  );
};
