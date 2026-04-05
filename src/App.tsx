import { App as AntdApp, ConfigProvider, theme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { RouterProvider } from "react-router-dom";

import AntdGlobalComp from "./AntdGlobalComp";
import router from "./routes";
import { useUserStore } from "./store";

/** Same stack as global.scss so Ant Design components render CJK (bundled Noto + OS fonts). */
const APP_FONT_FAMILY =
  '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", "Segoe UI", "SF Pro SC", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

function App() {
  const locale = useUserStore((state) => state.appSettings.locale);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <ConfigProvider
      autoInsertSpaceInButton={false}
      locale={locale === "zh-CN" ? zhCN : enUS}
      theme={{
        token: { colorPrimary: "#0089FF", fontFamily: APP_FONT_FAMILY },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>loading...</div>}>
          <AntdApp>
            <AntdGlobalComp />
            <RouterProvider router={router} />
          </AntdApp>
        </Suspense>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
