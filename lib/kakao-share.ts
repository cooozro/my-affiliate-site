type KakaoShareOptions = {
  url: string;
  title: string;
  imageUrl?: string;
};

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendDefault: (options: Record<string, unknown>) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.kakao.min.js";

function loadKakaoSdk(): Promise<void> {
  if (window.Kakao) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${KAKAO_SDK_URL}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Kakao SDK"));
    document.head.appendChild(script);
  });
}

export async function shareViaKakao({
  url,
  title,
  imageUrl,
}: KakaoShareOptions): Promise<void> {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

  if (!appKey) {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }

    await navigator.clipboard.writeText(`${title}\n${url}`);
    return;
  }

  await loadKakaoSdk();

  if (!window.Kakao) {
    throw new Error("Kakao SDK unavailable");
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(appKey);
  }

  const link = {
    mobileWebUrl: url,
    webUrl: url,
  };

  if (imageUrl) {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description: title,
        imageUrl,
        link,
      },
      buttons: [
        {
          title: "웹에서 보기",
          link,
        },
      ],
    });
    return;
  }

  window.Kakao.Share.sendDefault({
    objectType: "text",
    text: `${title}\n${url}`,
    link,
  });
}
