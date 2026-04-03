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
      // #region agent log
      fetch("http://127.0.0.1:7569/ingest/4583959c-10b5-46cf-b08d-6b29a02c2a95", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "cfa54e",
        },
        body: JSON.stringify({
          sessionId: "cfa54e",
          runId: "group-unread-debug-1",
          hypothesisId: "H2",
          location: "useConversationState.ts:26",
          message: "receive CHAT_LIST_RENDERED",
          data: {
            renderedConversationID,
            currentConversationID: latestCurrentConversation.current?.conversationID,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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
      // #region agent log
      fetch("http://127.0.0.1:7569/ingest/4583959c-10b5-46cf-b08d-6b29a02c2a95", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "cfa54e",
        },
        body: JSON.stringify({
          sessionId: "cfa54e",
          runId: "group-unread-debug-1",
          hypothesisId: "H3",
          location: "useConversationState.ts:64",
          message: "skip unread effect due to render mismatch",
          data: {
            conversationID,
            renderedConversationID: latestRenderedConversationID.current,
            unreadCount: currentConversation?.unreadCount,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }
    // #region agent log
    fetch("http://127.0.0.1:7569/ingest/4583959c-10b5-46cf-b08d-6b29a02c2a95", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "cfa54e",
      },
      body: JSON.stringify({
        sessionId: "cfa54e",
        runId: "group-unread-debug-1",
        hypothesisId: "H3",
        location: "useConversationState.ts:86",
        message: "trigger unread effect check",
        data: {
          conversationID,
          unreadCount: currentConversation?.unreadCount,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
      // #region agent log
      fetch("http://127.0.0.1:7569/ingest/4583959c-10b5-46cf-b08d-6b29a02c2a95", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "cfa54e",
        },
        body: JSON.stringify({
          sessionId: "cfa54e",
          runId: "group-unread-debug-1",
          hypothesisId: "H4",
          location: "useConversationState.ts:115",
          message: "checkConversationState blocked by conversation/sync",
          data: {
            hasConversation: Boolean(latestCurrentConversation.current),
            syncState: latestSyncState.current,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }

    const isPageVisible = document.visibilityState === "visible";
    // Avoid clearing unread while app is in background.
    if (!isPageVisible) {
      // #region agent log
      fetch("http://127.0.0.1:7569/ingest/4583959c-10b5-46cf-b08d-6b29a02c2a95", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "cfa54e",
        },
        body: JSON.stringify({
          sessionId: "cfa54e",
          runId: "group-unread-debug-1",
          hypothesisId: "H4",
          location: "useConversationState.ts:136",
          message: "checkConversationState blocked by visibility",
          data: {
            visibilityState: document.visibilityState,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }

    if (latestCurrentConversation.current.unreadCount > 0) {
      // #region agent log
      fetch("http://127.0.0.1:7569/ingest/4583959c-10b5-46cf-b08d-6b29a02c2a95", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "cfa54e",
        },
        body: JSON.stringify({
          sessionId: "cfa54e",
          runId: "group-unread-debug-1",
          hypothesisId: "H5",
          location: "useConversationState.ts:156",
          message: "call markConversationMessageAsRead",
          data: {
            conversationID: latestCurrentConversation.current.conversationID,
            unreadCount: latestCurrentConversation.current.unreadCount,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      IMSDK.markConversationMessageAsRead(
        latestCurrentConversation.current.conversationID,
      );
    } else {
      // #region agent log
      fetch("http://127.0.0.1:7569/ingest/4583959c-10b5-46cf-b08d-6b29a02c2a95", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "cfa54e",
        },
        body: JSON.stringify({
          sessionId: "cfa54e",
          runId: "group-unread-debug-1",
          hypothesisId: "H5",
          location: "useConversationState.ts:177",
          message: "skip markConversationMessageAsRead due to zero unread",
          data: {
            conversationID: latestCurrentConversation.current.conversationID,
            unreadCount: latestCurrentConversation.current.unreadCount,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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
