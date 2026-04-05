import { CloseOutlined } from "@ant-design/icons";
import { GroupType, SessionType } from "@openim/wasm-client-sdk";
import { Button, Input, Modal, Upload } from "antd";
import clsx from "clsx";
import i18n, { t } from "i18next";
import {
  FC,
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";

import { message } from "@/AntdGlobalComp";
import OIMAvatar from "@/components/OIMAvatar";
import { useConversationToggle } from "@/hooks/useConversationToggle";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { FileWithPath } from "@/pages/chat/queryChat/ChatFooter/SendActionBar/useFileMessage";
import { useUserStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import { emit } from "@/utils/events";
import { uploadFile } from "@/utils/imCommon";

import ChooseBox, { ChooseBoxHandle } from "./ChooseBox";
import { CheckListItem } from "./ChooseBox/CheckItem";

export type ChooseModalType =
  | "CRATE_GROUP"
  | "INVITE_TO_GROUP"
  | "KICK_FORM_GROUP"
  | "TRANSFER_IN_GROUP"
  | "SELECT_USER";

export interface SelectUserExtraData {
  notConversation: boolean;
  list: CheckListItem[];
}

export interface ChooseModalState {
  type: ChooseModalType;
  extraData?: unknown;
}

interface IChooseModalProps {
  state: ChooseModalState;
}

const titleMap = {
  CRATE_GROUP: t("placeholder.createGroup"),
  INVITE_TO_GROUP: t("placeholder.invitation"),
  KICK_FORM_GROUP: t("placeholder.kickMember"),
  TRANSFER_IN_GROUP: t("placeholder.transferGroup"),
  SELECT_USER: t("placeholder.selectUser"),
};

i18n.on("languageChanged", () => {
  titleMap.CRATE_GROUP = t("placeholder.createGroup");
  titleMap.INVITE_TO_GROUP = t("placeholder.invitation");
  titleMap.KICK_FORM_GROUP = t("placeholder.kickMember");
  titleMap.TRANSFER_IN_GROUP = t("placeholder.transferGroup");
  titleMap.SELECT_USER = t("placeholder.selectUser");
});

const onlyOneTypes = ["TRANSFER_IN_GROUP"];
const onlyMemberTypes = ["KICK_FORM_GROUP", "TRANSFER_IN_GROUP"];

const ChooseModal: ForwardRefRenderFunction<OverlayVisibleHandle, IChooseModalProps> = (
  { state: { type, extraData } },
  ref,
) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  return (
    <Modal
      title={null}
      footer={null}
      centered
      open={isOverlayOpen}
      closable={false}
      width={680}
      onCancel={closeOverlay}
      destroyOnClose
      styles={{
        mask: {
          opacity: 0,
          transition: "none",
        },
      }}
      className="no-padding-modal max-w-[80vw]"
      maskTransitionName=""
    >
      <ChooseContact
        isOverlayOpen={isOverlayOpen}
        type={type}
        extraData={extraData}
        closeOverlay={closeOverlay}
      />
    </Modal>
  );
};

export default memo(forwardRef(ChooseModal));

type ChooseContactProps = {
  isOverlayOpen: boolean;
  type: ChooseModalType;
  extraData?: unknown;
  closeOverlay: () => void;
};

export const ChooseContact: FC<ChooseContactProps> = ({
  isOverlayOpen,
  type,
  extraData,
  closeOverlay,
}) => {
  const chooseBoxRef = useRef<ChooseBoxHandle>(null);
  const [loading, setLoading] = useState(false);
  const [groupBaseInfo, setGroupBaseInfo] = useState({
    groupName: "",
    groupAvatar: "",
  });

  const { toSpecifiedConversation } = useConversationToggle();
  const selfUserID = useUserStore((state) => state.selfInfo.userID);

  useEffect(() => {
    if (isOverlayOpen && type === "CRATE_GROUP" && extraData) {
      setTimeout(
        () => chooseBoxRef.current?.updatePrevCheckList(extraData as CheckListItem[]),
        100,
      );
    }
    if (isOverlayOpen && type === "SELECT_USER" && extraData) {
      setTimeout(
        () =>
          chooseBoxRef.current?.updatePrevCheckList(
            (extraData as SelectUserExtraData).list,
          ),
        100,
      );
    }
    if (!isOverlayOpen) resetState();
  }, [isOverlayOpen]);

  const confirmChoose = async () => {
    console.log('confirmChoose called, type:', type);
    const choosedList = chooseBoxRef.current?.getCheckedList() ?? [];
    console.log('choosedList:', choosedList);
    if (!choosedList?.length && type !== "SELECT_USER") {
      console.log('Validation failed: no members selected');
      return message.warning(t("toast.selectLeastOne"));
    }

    if (!groupBaseInfo.groupName.trim() && type === "CRATE_GROUP") {
      console.log('Validation failed: group name empty');
      return message.warning(t("toast.inputGroupName"));
    }

    console.log('Starting group creation, groupName:', groupBaseInfo.groupName);
    setLoading(true);
    try {
      console.log('Executing switch for type:', type);
      switch (type) {
        case "CRATE_GROUP": {
          // Owner is not in choosedList; one invitee is valid (2-person group).
          // Do not redirect to single chat when length === 1 — that skips createGroup
          // and the invitee never joins or receives group notifications.
          console.log('Calling IMSDK.createGroup with:', {
            groupInfo: {
              groupType: GroupType.WorkingGroup,
              groupName: groupBaseInfo.groupName,
              faceURL: groupBaseInfo.groupAvatar,
            },
            ownerUserID: selfUserID,
            memberUserIDs: choosedList.map((item) => item.userID!),
            adminUserIDs: [],
          });
          const { data: groupInfo } = await IMSDK.createGroup({
            groupInfo: {
              groupType: GroupType.WorkingGroup,
              groupName: groupBaseInfo.groupName,
              faceURL: groupBaseInfo.groupAvatar,
            },
            ownerUserID: selfUserID,
            memberUserIDs: choosedList.map((item) => item.userID!),
            adminUserIDs: [],
          });
          console.log('IMSDK.createGroup success, groupInfo:', groupInfo);
          await toSpecifiedConversation({
            sourceID: groupInfo.groupID,
            sessionType: SessionType.WorkingGroup,
          });
          break;
        }
        case "INVITE_TO_GROUP":
          await IMSDK.inviteUserToGroup({
            groupID: extraData as string,
            userIDList: choosedList.map((item) => item.userID!),
            reason: "",
          });
          break;
        case "KICK_FORM_GROUP":
          await IMSDK.kickGroupMember({
            groupID: extraData as string,
            userIDList: choosedList.map((item) => item.userID!),
            reason: "",
          });
          break;
        case "TRANSFER_IN_GROUP":
          await IMSDK.transferGroupOwner({
            groupID: extraData as string,
            newOwnerUserID: choosedList[0].userID!,
          });
          break;
        case "SELECT_USER":
          emit("SELECT_USER", {
            notConversation: (extraData as SelectUserExtraData).notConversation,
            choosedList,
          });
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in confirmChoose:', error);
      feedbackToast({ error });
    }
    console.log('confirmChoose completed successfully');
    setLoading(false);
    closeOverlay();
  };

  const resetState = () => {
    chooseBoxRef.current?.resetState();
    setGroupBaseInfo({
      groupName: "",
      groupAvatar: "",
    });
  };

  const customUpload = async ({ file }: { file: FileWithPath }) => {
    try {
      const {
        data: { url },
      } = await uploadFile(file);
      setGroupBaseInfo((prev) => ({ ...prev, groupAvatar: url }));
    } catch (error) {
      feedbackToast({ error: t("toast.updateAvatarFailed") });
    }
  };

  const isCheckInGroup = type === "INVITE_TO_GROUP";

  return (
    <>
      <div className="flex h-16 items-center justify-between bg-[var(--gap-text)] px-7">
        <div>{titleMap[type]}</div>
        <CloseOutlined
          className="cursor-pointer text-[var(--sub-text)]"
          rev={undefined}
          onClick={closeOverlay}
        />
      </div>
      {type === "CRATE_GROUP" ? (
        <div className="px-6 pt-4">
          <div className="mb-6 flex items-center">
            <div className="min-w-[60px] font-medium">{t("placeholder.groupName")}</div>
            <Input
              placeholder={t("placeholder.pleaseEnter")}
              maxLength={16}
              spellCheck={false}
              value={groupBaseInfo.groupName}
              onChange={(e) =>
                setGroupBaseInfo((state) => ({ ...state, groupName: e.target.value }))
              }
            />
          </div>
          <div className="mb-6 flex items-center">
            <div className="min-w-[60px] font-medium">
              {t("placeholder.groupAvatar")}
            </div>
            <div className="flex items-center">
              <OIMAvatar src={groupBaseInfo.groupAvatar} isgroup />
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={customUpload as any}
              >
                <span className="ml-3 cursor-pointer text-xs text-[var(--primary)]">
                  {t("placeholder.clickToModify")}
                </span>
              </Upload>
            </div>
          </div>
          <div className="flex">
            <div className="min-w-[60px] font-medium">
              {t("placeholder.groupMember")}
            </div>
            <ChooseBox className={clsx("!m-0 !h-[40vh] flex-1")} ref={chooseBoxRef} />
          </div>
        </div>
      ) : (
        <ChooseBox
          className="!h-[60vh]"
          ref={chooseBoxRef}
          isCheckInGroup={isCheckInGroup}
          showGroupMember={onlyMemberTypes.includes(type)}
          chooseOneOnly={onlyOneTypes.includes(type)}
          checkMemberRole={type === "KICK_FORM_GROUP"}
        />
      )}
      <div className="flex justify-end px-9 py-6">
        <Button
          className="mr-6 border-0 bg-[var(--chat-bubble)] px-6"
          onClick={closeOverlay}
        >
          {t("cancel")}
        </Button>
        <Button
          className="px-6"
          type="primary"
          loading={loading}
          onClick={confirmChoose}
        >
          {t("confirm")}
        </Button>
      </div>
    </>
  );
};
