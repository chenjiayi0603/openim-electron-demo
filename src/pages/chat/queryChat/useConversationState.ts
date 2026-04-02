import { useLatest, useThrottleFn, useUpdateEffect } from "ahooks";
import { useEffect } from "react";

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

  useUpdateEffect(() => {
    if (syncState !== "loading") {
      checkConversationState();
    }
  }, [syncState]);

  useEffect(() => {
    const onChatListRendered = (renderedConversationID: string) => {
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

  useEffect(() => {
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
    )
      return;

    const isPageVisible = document.visibilityState === "visible";
    const isWindowFocused = typeof document.hasFocus === "function" && document.hasFocus();
    if (!isPageVisible || !isWindowFocused) return;

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
