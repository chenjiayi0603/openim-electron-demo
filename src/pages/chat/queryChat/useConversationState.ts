import { useLatest, useThrottleFn, useUpdateEffect } from "ahooks";
import { useEffect, useRef } from "react";

import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore, useUserStore } from "@/store";
import emitter from "@/utils/events";

export default function useConversationState() {
  const syncState = useUserStore((state) => state.syncState);
  const latestSyncState = useLatest(syncState);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const latestCurrentConversation = useLatest(currentConversation);
  // Record the latest conversation whose message list is really rendered.
  const latestRenderedConversationID = useRef("");

  useUpdateEffect(() => {
    if (syncState !== "loading") {
      checkConversationState();
    }
  }, [syncState]);

  useEffect(() => {
    const onChatListRendered = (renderedConversationID: string) => {
      latestRenderedConversationID.current = renderedConversationID;
      if (
        renderedConversationID &&
        renderedConversationID === latestCurrentConversation.current?.conversationID
      ) {
        throttleCheckConversationState();
      }
    };
    emitter.on("CHAT_LIST_RENDERED", onChatListRendered);
    return () => {
      emitter.off("CHAT_LIST_RENDERED", onChatListRendered);
    };
  }, []);

  useUpdateEffect(() => {
    const conversationID = currentConversation?.conversationID;
    if (!conversationID) return;
    // Only auto-read after the current conversation list is actually rendered.
    if (latestRenderedConversationID.current !== conversationID) {
      return;
    }
    throttleCheckConversationState();
  }, [currentConversation?.unreadCount]);

  useEffect(() => {
    const conversationID = currentConversation?.conversationID;
    if (!conversationID) return;

    // Fallback: event timing can be missed on first switch, retry briefly.
    let timer: number | undefined;
    let retry = 0;
    const tryCheck = () => {
      if (latestRenderedConversationID.current === conversationID) {
        throttleCheckConversationState();
        return;
      }
      retry += 1;
      if (retry < 5) {
        timer = window.setTimeout(tryCheck, 200);
      }
    };
    timer = window.setTimeout(tryCheck, 0);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [currentConversation?.conversationID]);

  useEffect(() => {
    // Re-check when window/page becomes active again.
    const onWindowActive = () => {
      throttleCheckConversationState();
    };

    window.addEventListener("focus", onWindowActive);
    document.addEventListener("visibilitychange", onWindowActive);

    return () => {
      window.removeEventListener("focus", onWindowActive);
      document.removeEventListener("visibilitychange", onWindowActive);
    };
  }, []);

  const checkConversationState = () => {
    if (
      !latestCurrentConversation.current ||
      latestSyncState.current === "loading"
    ) {
      return;
    }

    const isPageVisible = document.visibilityState === "visible";
    // Avoid clearing unread while app is in background.
    if (!isPageVisible) {
      return;
    }

    if (latestCurrentConversation.current.unreadCount > 0) {
      IMSDK.markConversationMessageAsRead(
        latestCurrentConversation.current.conversationID,
      );
    }
  };

  const { run: throttleCheckConversationState } = useThrottleFn(
    checkConversationState,
    { wait: 2000, leading: false },
  );

  return {
    currentConversation,
  };
}
